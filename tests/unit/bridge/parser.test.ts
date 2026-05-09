import { describe, it, expect } from "vitest";
import { parseClaudeResponse, claudeResponseSchema } from "@/bridge/parser.js";

describe("parseClaudeResponse", () => {
  it("parses valid JSON response with findings", () => {
    const raw = JSON.stringify({
      findings: [
        {
          id: "abc123",
          file: "src/auth.ts",
          line: 42,
          severity: "critical",
          mode: "security",
          title: "SQL injection",
          description: "User input in query",
          evidence: "const q = `SELECT ${id}`",
          suggestion: "Use parameterized queries",
          confidence: "high",
        },
      ],
      moduleSummary: "Auth module has issues",
      healthScore: 45,
    });
    const result = parseClaudeResponse(raw);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].severity).toBe("critical");
    expect(result.healthScore).toBe(45);
  });

  it("returns empty findings for invalid JSON", () => {
    const result = parseClaudeResponse("not json at all");
    expect(result.findings).toEqual([]);
    expect(result.healthScore).toBe(50);
  });

  it("extracts JSON from markdown code blocks", () => {
    const raw = 'Some text\n```json\n{"findings":[],"moduleSummary":"ok","healthScore":90}\n```\nMore text';
    const result = parseClaudeResponse(raw);
    expect(result.findings).toEqual([]);
    expect(result.healthScore).toBe(90);
  });
});
