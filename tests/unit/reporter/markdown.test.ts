import { describe, it, expect } from "vitest";
import { generateMarkdownString } from "@/reporter/markdown.js";

describe("generateMarkdownString", () => {
  it("includes health score in output", () => {
    const scanResult = {
      meta: { version: "0.1.0", timestamp: "2026-05-09", project: { name: "test" }, scope: "full", mode: "full", duration: 1000 } as any,
      summary: { totalFindings: 1, bySeverity: { high: 1 }, byMode: { security: 1 }, fixable: 1, autoFixable: 0, healthScore: 85 },
      findings: [{ id: "f1", file: "a.ts", line: 1, severity: "high", mode: "security", title: "Test Issue", description: "desc", evidence: "code", suggestion: "fix it", confidence: "high" }],
      modules: [],
      crossModuleFindings: [],
    };
    const md = generateMarkdownString(scanResult as any);
    expect(md).toContain("85/100");
    expect(md).toContain("Test Issue");
    expect(md).toContain("a.ts");
  });

  it("shows branch scope indicator", () => {
    const scanResult = {
      meta: { scope: "branch", base: "main", project: { name: "test" }, changedFiles: ["a.ts"], mode: "full", duration: 500 } as any,
      summary: { totalFindings: 0, bySeverity: {}, byMode: {}, fixable: 0, autoFixable: 0, healthScore: 100 },
      findings: [],
      modules: [],
      crossModuleFindings: [],
    };
    const md = generateMarkdownString(scanResult as any);
    expect(md).toContain("Branch");
    expect(md).toContain("main");
  });
});
