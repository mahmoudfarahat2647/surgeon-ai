import type { ModuleCluster } from "../types/graph.js";
import type { FrameworkProfile, AuditMode } from "../profiles/types.js";
import { getProfileFragments, getAllPitfalls } from "../profiles/index.js";
import type { ModuleScan } from "../types/scan.js";
import type { Finding } from "../types/finding.js";

export function buildChunkPrompt(
  chunk: ModuleCluster,
  profiles: FrameworkProfile[],
  mode: AuditMode,
  depth: "shallow" | "standard" | "deep",
  fileContents: Map<string, string>,
): string {
  const depthInstruction: Record<string, string> = {
    shallow: "Focus on critical and high severity issues only. Be concise.",
    standard: "Cover all severity levels. Provide clear evidence and suggestions.",
    deep: "Be exhaustive. Check edge cases, race conditions, subtle logic errors. Include info-level observations.",
  };

  const filesSection = chunk.files
    .map((f) => {
      const content = fileContents.get(f.path) ?? "";
      const ext = f.path.split(".").pop() ?? "ts";
      return `### ${f.path}\n\`\`\`${ext}\n${content}\n\`\`\``;
    })
    .join("\n\n");

  return `You are performing a ${mode} audit of a codebase module.

## Instructions
${depthInstruction[depth]}

## Output Format
Return ONLY valid JSON matching this schema:
{"findings": [{"id":"","file":"","line":0,"severity":"","mode":"","title":"","description":"","evidence":"","suggestion":"","confidence":"","fix":{"description":"","diff":[{"file":"","oldCode":"","newCode":"","startLine":0,"endLine":0}],"confidence":"","breaking":false}}], "moduleSummary":"", "healthScore": 0}

Each finding MUST include exact file path, line number, evidence code, concrete suggestion, and confidence level.
Do NOT report style preferences, issues in generated code, or theoretical issues requiring unlikely preconditions.

## Audit Rules
${getProfileFragments(profiles, mode)}

## Known Pitfalls
${getAllPitfalls(profiles)}

## Module Context
Module: ${chunk.id}
Files: ${chunk.files.map((f) => f.path).join(", ")}

## Files to Audit
${filesSection}`;
}

export function buildCrossModulePrompt(
  modules: ModuleScan[],
  existingFindings: Finding[],
  projectName: string,
): string {
  const moduleSummaries = modules
    .map((m) => `### ${m.path} (health: ${m.healthScore}/100)\nFiles: ${m.files.join(", ")}\nFindings: ${m.findings.length} issues`)
    .join("\n\n");

  const existingIds = existingFindings
    .map((f) => `- [${f.id}] ${f.file}:${f.line} — ${f.title}`)
    .join("\n");

  return `You are performing an architectural review of the full codebase "${projectName}".
Individual modules have already been audited. Find CROSS-CUTTING issues only visible at system level.

## Focus Areas
1. Inconsistent patterns across modules (auth handled differently)
2. Missing integration points (error handling gaps between modules)
3. Data flow vulnerabilities (tainted data crossing module boundaries)
4. Architectural issues: circular deps, god modules, missing layers
5. Duplicate logic across modules

## Module Summaries
${moduleSummaries}

## Existing Findings (do NOT duplicate these)
${existingIds}

## Output Format
Return ONLY valid JSON: {"findings": [...], "moduleSummary": "", "healthScore": 0}
Return only NEW cross-module findings.`;
}
