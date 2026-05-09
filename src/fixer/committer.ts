import simpleGit from "simple-git";
import type { FixResult, FixPlan, CommitInfo } from "../types/fix.js";

export async function commitFixes(
  projectPath: string,
  results: FixResult[],
  plan: FixPlan,
): Promise<CommitInfo> {
  const applied = results.filter((r) => r.status === "applied");
  if (applied.length === 0) {
    return { committed: false, message: "No fixes applied" };
  }

  const git = simpleGit(projectPath);

  // Group by mode
  const byMode = new Map<string, FixResult[]>();
  for (const result of applied) {
    const finding = plan.fixes.find((f) => f.findingId === result.findingId);
    if (!finding) continue;
    const mode = finding.finding.mode;
    if (!byMode.has(mode)) byMode.set(mode, []);
    byMode.get(mode)!.push(result);
  }

  let commitCount = 0;
  for (const [mode, fixes] of byMode) {
    const files = fixes.flatMap((f) => f.filesModified);
    await git.add(files);
    const titles = fixes
      .map((f) => {
        const planned = plan.fixes.find((p) => p.findingId === f.findingId);
        return `  - ${planned?.finding.title ?? f.findingId}`;
      })
      .join("\n");
    await git.commit(`surgeon: fix ${fixes.length} ${mode} issue(s)\n\n${titles}`);
    commitCount++;
  }

  return {
    committed: true,
    commitCount,
    fixCount: applied.length,
  };
}
