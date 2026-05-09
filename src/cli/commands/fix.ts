import path from "path";
import fs from "fs/promises";
import readline from "readline";
import ora from "ora";
import { planFixes } from "../../fixer/planner.js";
import { BranchGuardImpl } from "../../fixer/guard.js";
import { applyFixes } from "../../fixer/applier.js";
import { validate } from "../../fixer/validator.js";
import { commitFixes } from "../../fixer/committer.js";
import { loadConfig } from "../../config/index.js";
import { getChangedFiles, getBaseBranch } from "../../git/index.js";
import { printBanner, printSuccess, printError, printInfo } from "../output.js";
import type { ScanResult } from "../../types/scan.js";
import type { FixOptions } from "../../types/fix.js";

interface FixFlags {
  branch?: boolean;
  base?: string;
  yes?: boolean;
  confidence?: string;
}

async function promptUser(message: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`  ${message} `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

export async function fixCommand(targetPath: string, flags: FixFlags): Promise<void> {
  printBanner();
  const projectPath = path.resolve(targetPath || ".");
  const config = await loadConfig(projectPath);

  // Read last scan
  const lastScanPath = path.join(projectPath, ".surgeon", "last-scan.json");
  let scanResult: ScanResult;
  try {
    const raw = await fs.readFile(lastScanPath, "utf-8");
    scanResult = JSON.parse(raw);
  } catch {
    printError("No scan results found. Run 'srgn scan .' first.");
    process.exit(1);
    return;
  }

  // Check for TUI selections
  let selectedIds: string[] | undefined;
  try {
    const selectionsRaw = await fs.readFile(path.join(projectPath, ".surgeon", "selected-fixes.json"), "utf-8");
    const selections = JSON.parse(selectionsRaw);
    if (selections.selectedIds?.length > 0) {
      selectedIds = selections.selectedIds as string[];
      printInfo(`Using ${selectedIds.length} selections from srgn review`);
    }
  } catch {
    // No selections
  }

  let scope: "full" | "branch" = "full";
  if (flags.branch) {
    scope = "branch";
    const base = flags.base ?? config.base ?? (await getBaseBranch(projectPath));
    const changed = await getChangedFiles(projectPath, base);
    scanResult.meta.changedFiles = changed;
  }

  const fixOptions: FixOptions = {
    scope,
    autoApprove: flags.yes ?? false,
    confidenceThreshold: (flags.confidence ?? config.fix.autoApproveConfidence) as "high" | "medium" | "low",
    selectedIds,
    dryRun: false,
  };

  const plan = planFixes(scanResult, fixOptions);
  printInfo(`Found ${plan.fixes.length} fixable (${plan.skipped.length} skipped)`);

  if (plan.fixes.length === 0) {
    printInfo("Nothing to fix.");
    return;
  }

  // Create branch guard
  const guard = new BranchGuardImpl(projectPath, config.fix.branchPrefix);
  const spinner = ora("Creating fix branch...").start();

  try {
    await guard.create();
    spinner.succeed(`Fix branch: ${guard.fixBranch}`);

    // Apply fixes
    const results = await applyFixes(projectPath, plan, promptUser);

    const applied = results.filter((r) => r.status === "applied");
    const failed = results.filter((r) => r.status === "failed");
    const rejected = results.filter((r) => r.status === "rejected");

    // Validate
    if (applied.length > 0) {
      const modifiedFiles = applied.flatMap((r) => r.filesModified);
      const hasTS = scanResult.meta.project.languages.includes("typescript");
      const validation = await validate(projectPath, modifiedFiles, hasTS);

      if (validation.typeCheck.passed) printSuccess("Type check passed");
      else printError(`Type check failed: ${validation.typeCheck.errors.length} errors`);
      if (validation.testRun.passed) printSuccess("Tests passed");

      // Commit
      await commitFixes(projectPath, results, plan);
    }

    await guard.complete();

    printSuccess(`Applied: ${applied.length} | Failed: ${failed.length} | Rejected: ${rejected.length}`);
    printInfo(`\nTo review: git diff ${guard.originalBranch}...${guard.fixBranch}`);
    printInfo(`To merge:  git checkout ${guard.originalBranch} && git merge ${guard.fixBranch}`);
    printInfo(`To discard: git checkout ${guard.originalBranch} && git branch -D ${guard.fixBranch}`);
  } catch (err) {
    spinner.fail("Fix failed");
    await guard.rollback();
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
