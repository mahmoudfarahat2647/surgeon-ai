import { describe, it, expect } from "vitest";
import { planFixes } from "@/fixer/planner.js";
import type { ScanResult } from "@/types/scan.js";
import type { Finding } from "@/types/finding.js";

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: "f1",
    file: "src/a.ts",
    line: 1,
    severity: "high",
    mode: "security",
    title: "test",
    description: "test",
    evidence: "",
    suggestion: "",
    confidence: "high",
    fix: {
      description: "fix it",
      diff: [{ file: "src/a.ts", oldCode: "old", newCode: "new", startLine: 1, endLine: 1 }],
      confidence: "high",
      breaking: false,
    },
    ...overrides,
  };
}

function makeScanResult(findings: Finding[]): ScanResult {
  return {
    meta: { mode: "full", scope: "full", changedFiles: undefined } as any,
    summary: {} as any,
    findings,
    modules: [],
    crossModuleFindings: [],
  };
}

describe("planFixes", () => {
  it("includes findings with fixes", () => {
    const plan = planFixes(makeScanResult([makeFinding()]), { scope: "full", autoApprove: false, confidenceThreshold: "high", dryRun: false });
    expect(plan.fixes).toHaveLength(1);
  });

  it("skips findings without fixes", () => {
    const plan = planFixes(makeScanResult([makeFinding({ fix: undefined })]), { scope: "full", autoApprove: false, confidenceThreshold: "high", dryRun: false });
    expect(plan.fixes).toHaveLength(0);
    expect(plan.skipped).toHaveLength(1);
  });

  it("marks high-confidence as auto when --yes", () => {
    const plan = planFixes(makeScanResult([makeFinding()]), { scope: "full", autoApprove: true, confidenceThreshold: "high", dryRun: false });
    expect(plan.fixes[0].approval).toBe("auto");
  });

  it("marks medium-confidence as prompt even with --yes", () => {
    const finding = makeFinding({ fix: { ...makeFinding().fix!, confidence: "medium" } });
    const plan = planFixes(makeScanResult([finding]), { scope: "full", autoApprove: true, confidenceThreshold: "high", dryRun: false });
    expect(plan.fixes[0].approval).toBe("prompt");
  });

  it("orders by severity (critical first)", () => {
    const findings = [
      makeFinding({ id: "low", severity: "low" }),
      makeFinding({ id: "crit", severity: "critical" }),
    ];
    const plan = planFixes(makeScanResult(findings), { scope: "full", autoApprove: false, confidenceThreshold: "high", dryRun: false });
    expect(plan.order[0]).toBe("crit");
  });
});
