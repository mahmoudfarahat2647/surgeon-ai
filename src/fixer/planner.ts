import type { Finding } from "../types/finding.js";
import type { ScanResult } from "../types/scan.js";
import type { FixPlan, PlannedFix, SkippedFix, FixOptions } from "../types/fix.js";

const SEVERITY_PRIORITY: Record<string, number> = {
  critical: 0, high: 1, medium: 2, low: 3, info: 4,
};

const CONFIDENCE_RANK: Record<string, number> = {
  high: 3, medium: 2, low: 1,
};

function shouldAutoApprove(finding: Finding, options: FixOptions): boolean {
  if (!options.autoApprove || !finding.fix) return false;
  return CONFIDENCE_RANK[finding.fix.confidence] >= CONFIDENCE_RANK[options.confidenceThreshold];
}

export function planFixes(scanResult: ScanResult, options: FixOptions): FixPlan {
  let allFindings = [...scanResult.findings, ...scanResult.crossModuleFindings];

  // Filter by scope
  if (options.scope === "branch" && scanResult.meta.changedFiles) {
    const changed = new Set(scanResult.meta.changedFiles);
    allFindings = allFindings.filter((f) => changed.has(f.file));
  }

  // Filter by TUI selection
  if (options.selectedIds) {
    const selected = new Set(options.selectedIds);
    allFindings = allFindings.filter((f) => selected.has(f.id));
  }

  // Filter by scan mode
  if (scanResult.meta.mode !== "full") {
    allFindings = allFindings.filter((f) => f.mode === scanResult.meta.mode);
  }

  const fixes: PlannedFix[] = [];
  const skipped: SkippedFix[] = [];

  for (const finding of allFindings) {
    if (!finding.fix) {
      skipped.push({ findingId: finding.id, reason: "no-fix-available" });
      continue;
    }

    fixes.push({
      findingId: finding.id,
      finding,
      priority: SEVERITY_PRIORITY[finding.severity] ?? 4,
      approval: shouldAutoApprove(finding, options) ? "auto" : "prompt",
    });
  }

  // Sort: critical first, then by file for batching
  fixes.sort((a, b) => a.priority - b.priority || a.finding.file.localeCompare(b.finding.file));

  return {
    scanId: scanResult.meta.timestamp,
    scope: options.scope,
    mode: scanResult.meta.mode,
    fixes,
    skipped,
    order: fixes.map((f) => f.findingId),
  };
}
