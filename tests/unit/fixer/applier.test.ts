import { describe, it, expect, vi } from "vitest";
import { applyFixes } from "@/fixer/applier.js";
import type { FixPlan } from "@/types/fix.js";
import fs from "fs/promises";
import path from "path";
import os from "os";

describe("applyFixes", () => {
  it("applies a fix to a file", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "surgeon-test-"));
    const testFile = path.join(tmpDir, "src", "a.ts");
    await fs.mkdir(path.dirname(testFile), { recursive: true });
    await fs.writeFile(testFile, "const x = old_code;", "utf-8");

    const plan: FixPlan = {
      scanId: "test",
      scope: "full",
      mode: "security",
      fixes: [
        {
          findingId: "f1",
          finding: {
            id: "f1",
            file: "src/a.ts",
            line: 1,
            severity: "high",
            mode: "security",
            title: "test fix",
            description: "test",
            evidence: "",
            suggestion: "",
            confidence: "high",
            fix: {
              description: "replace old with new",
              diff: [{ file: "src/a.ts", oldCode: "old_code", newCode: "new_code", startLine: 1, endLine: 1 }],
              confidence: "high",
              breaking: false,
            },
          },
          priority: 1,
          approval: "auto",
        },
      ],
      skipped: [],
      order: ["f1"],
    };

    const promptUser = vi.fn(async () => "y");
    const results = await applyFixes(tmpDir, plan, promptUser);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("applied");
    const updated = await fs.readFile(testFile, "utf-8");
    expect(updated).toBe("const x = new_code;");

    await fs.rm(tmpDir, { recursive: true });
  });

  it("returns failed status when old code not found", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "surgeon-test-"));
    const testFile = path.join(tmpDir, "src", "b.ts");
    await fs.mkdir(path.dirname(testFile), { recursive: true });
    await fs.writeFile(testFile, "const x = different_code;", "utf-8");

    const plan: FixPlan = {
      scanId: "test",
      scope: "full",
      mode: "security",
      fixes: [
        {
          findingId: "f2",
          finding: {
            id: "f2",
            file: "src/b.ts",
            line: 1,
            severity: "high",
            mode: "security",
            title: "test fix",
            description: "test",
            evidence: "",
            suggestion: "",
            confidence: "high",
            fix: {
              description: "replace old with new",
              diff: [{ file: "src/b.ts", oldCode: "nonexistent_code", newCode: "new_code", startLine: 1, endLine: 1 }],
              confidence: "high",
              breaking: false,
            },
          },
          priority: 1,
          approval: "auto",
        },
      ],
      skipped: [],
      order: ["f2"],
    };

    const promptUser = vi.fn(async () => "y");
    const results = await applyFixes(tmpDir, plan, promptUser);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("failed");
    expect(results[0].error).toContain("Expected code not found");

    await fs.rm(tmpDir, { recursive: true });
  });
});
