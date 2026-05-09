import { describe, it, expect } from "vitest";
import { generateJsonString } from "@/reporter/json.js";

describe("generateJsonString", () => {
  it("produces valid JSON from scan result", () => {
    const scanResult = {
      meta: { version: "0.1.0", timestamp: "2026-05-09" } as any,
      summary: { totalFindings: 0, healthScore: 100 } as any,
      findings: [],
      modules: [],
      crossModuleFindings: [],
    };
    const json = generateJsonString(scanResult);
    expect(() => JSON.parse(json)).not.toThrow();
    expect(JSON.parse(json).meta.version).toBe("0.1.0");
  });
});
