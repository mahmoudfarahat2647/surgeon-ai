import path from "path";
import fs from "fs/promises";
import ora from "ora";
import { loadConfig } from "../../config/index.js";
import { analyze, type AnalyzeOptions } from "../../analyzer/index.js";
import { generateReports } from "../../reporter/index.js";
import { getChangedFiles, getBaseBranch } from "../../git/index.js";
import { printBanner, printScanSummary, printSuccess, printInfo, printError } from "../output.js";
import type { AuditMode } from "../../profiles/types.js";

interface ScanFlags {
  branch?: boolean;
  base?: string;
  mode?: string;
  depth?: string;
  format?: string;
  output?: string;
  autoFix?: boolean;
  include?: string;
  exclude?: string;
  lang?: string;
}

export async function scanCommand(targetPath: string, flags: ScanFlags): Promise<void> {
  printBanner();
  const projectPath = path.resolve(targetPath || ".");
  const config = await loadConfig(projectPath);

  const spinner = ora("Discovering files...").start();

  let changedFiles: string[] | undefined;
  let scope: "full" | "branch" = "full";

  if (flags.branch) {
    scope = "branch";
    const base = flags.base ?? config.base ?? (await getBaseBranch(projectPath));
    changedFiles = await getChangedFiles(projectPath, base);
    spinner.text = `Branch scan: ${changedFiles.length} changed files vs ${base}`;
  }

  const analyzeOptions: AnalyzeOptions = {
    projectPath,
    config,
    mode: (flags.mode ?? config.mode ?? "full") as AuditMode | "full",
    depth: (flags.depth ?? config.depth ?? "standard") as "shallow" | "standard" | "deep",
    scope,
    changedFiles,
    onProgress: (progress) => {
      spinner.text = `Auditing... ${progress.completed}/${progress.total} modules (${progress.active.join(", ")})`;
    },
  };

  try {
    const result = await analyze(analyzeOptions);
    spinner.succeed(`Scan complete in ${(result.meta.duration / 1000).toFixed(1)}s`);

    printScanSummary(result.summary);

    // Save last scan
    const surgeonDir = path.join(projectPath, ".surgeon");
    await fs.mkdir(surgeonDir, { recursive: true });
    await fs.writeFile(
      path.join(surgeonDir, "last-scan.json"),
      JSON.stringify(result, null, 2),
      "utf-8",
    );

    // Generate reports
    const outputDir = path.resolve(projectPath, flags.output ?? config.output);
    const format = (flags.format ?? "all") as "json" | "md" | "html" | "all";
    await generateReports(result, { output: outputDir, format });

    printSuccess(`Reports saved to ${outputDir}/`);
    printInfo("Next: srgn review | srgn fix . | srgn fix . --yes");
  } catch (err) {
    spinner.fail("Scan failed");
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
