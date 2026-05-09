import { z } from "zod";

const findingSchema = z.object({
  id: z.string().default(""),
  file: z.string(),
  line: z.number(),
  endLine: z.number().optional(),
  column: z.number().optional(),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  mode: z.enum(["security", "performance", "reliability", "maintainability", "tests"]),
  title: z.string(),
  description: z.string(),
  evidence: z.string().default(""),
  suggestion: z.string().default(""),
  fix: z
    .object({
      description: z.string(),
      diff: z.array(
        z.object({
          file: z.string(),
          oldCode: z.string(),
          newCode: z.string(),
          startLine: z.number(),
          endLine: z.number(),
        }),
      ),
      confidence: z.enum(["high", "medium", "low"]),
      breaking: z.boolean(),
      testSuggestion: z.string().optional(),
    })
    .optional(),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
  framework: z.string().optional(),
  rule: z.string().optional(),
  references: z.array(z.string()).optional(),
});

export const claudeResponseSchema = z.object({
  findings: z.array(findingSchema),
  moduleSummary: z.string().default(""),
  healthScore: z.number().min(0).max(100).default(50),
});

export type ClaudeAuditResponse = z.infer<typeof claudeResponseSchema>;

function extractJsonFromMarkdown(text: string): string | null {
  const match = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  return match ? match[1] : null;
}

export function parseClaudeResponse(raw: string): ClaudeAuditResponse {
  // Try direct JSON parse
  try {
    const parsed = JSON.parse(raw);
    return claudeResponseSchema.parse(parsed);
  } catch {
    // Not direct JSON
  }

  // Try extracting from markdown code block
  const extracted = extractJsonFromMarkdown(raw);
  if (extracted) {
    try {
      const parsed = JSON.parse(extracted);
      return claudeResponseSchema.parse(parsed);
    } catch {
      // Invalid JSON in code block
    }
  }

  // Fallback: empty response
  return { findings: [], moduleSummary: "", healthScore: 50 };
}
