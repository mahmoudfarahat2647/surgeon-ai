import fs from "fs/promises";
import path from "path";
import type { FixPlan, FixResult } from "../types/fix.js";
import type { FileDiff } from "../types/finding.js";

async function snapshotFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf-8");
}

async function restoreFile(filePath: string, content: string): Promise<void> {
  await fs.writeFile(filePath, content, "utf-8");
}

async function applyDiff(projectPath: string, diff: FileDiff): Promise<void> {
  const filePath = path.resolve(projectPath, diff.file);
  const content = await fs.readFile(filePath, "utf-8");

  if (!content.includes(diff.oldCode)) {
    throw new Error(`Expected code not found in ${diff.file}:${diff.startLine}. File may have been modified since scan.`);
  }

  const updated = content.replace(diff.oldCode, diff.newCode);
  await fs.writeFile(filePath, updated, "utf-8");
}

export async function applyFixes(
  projectPath: string,
  plan: FixPlan,
  promptUser: (message: string) => Promise<string>,
): Promise<FixResult[]> {
  const results: FixResult[] = [];

  for (const fixId of plan.order) {
    const planned = plan.fixes.find((f) => f.findingId === fixId);
    if (!planned || !planned.finding.fix) continue;

    // Prompt user if needed
    if (planned.approval === "prompt") {
      const answer = await promptUser(
        `Apply ${planned.finding.fix.confidence}-confidence fix for "${planned.finding.title}" in ${planned.finding.file}? [y/n/s(skip all)]`,
      );
      if (answer === "n" || answer === "s") {
        results.push({ findingId: fixId, status: "rejected", filesModified: [], userApproved: false });
        if (answer === "s") break;
        continue;
      }
    }

    // Snapshot files for rollback
    const snapshots = new Map<string, string>();
    for (const diff of planned.finding.fix.diff) {
      const absPath = path.resolve(projectPath, diff.file);
      snapshots.set(absPath, await snapshotFile(absPath));
    }

    try {
      for (const diff of planned.finding.fix.diff) {
        await applyDiff(projectPath, diff);
      }
      results.push({
        findingId: fixId,
        status: "applied",
        filesModified: planned.finding.fix.diff.map((d) => d.file),
        userApproved: planned.approval === "prompt",
      });
    } catch (err) {
      // Rollback
      for (const [absPath, content] of snapshots) {
        await restoreFile(absPath, content);
      }
      results.push({
        findingId: fixId,
        status: "failed",
        filesModified: [],
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}
