import fs from "fs/promises";
import path from "path";
import type { ScanResult } from "../types/scan.js";

export function generateMarkdownString(scanResult: ScanResult): string {
  const { meta, summary, findings, crossModuleFindings, modules } = scanResult;
  const allFindings = [...findings, ...crossModuleFindings];

  const scopeLabel = meta.scope === "branch"
    ? `Branch scan (vs ${meta.base}, ${meta.changedFiles?.length ?? 0} files changed)`
    : "Full scan";

  const severityTable = Object.entries(summary.bySeverity)
    .map(([sev, count]) => `| ${sev} | ${count} |`)
    .join("\n");

  const findingsSection = allFindings
    .map((f) => {
      const section = `### [${f.id}] ${f.title}\n- **File:** \`${f.file}:${f.line}\`\n- **Severity:** ${f.severity}\n- **Mode:** ${f.mode}\n- **Confidence:** ${f.confidence}\n- **Fix available:** ${f.fix ? "Yes" : "No"}\n\n> **Evidence:**\n> \`\`\`\n> ${f.evidence}\n> \`\`\`\n\n> **Suggestion:** ${f.suggestion}`;
      return section;
    })
    .join("\n\n---\n\n");

  const moduleTable = modules
    .map((m) => `| ${m.path} | ${m.healthScore}/100 | ${m.findings.length} |`)
    .join("\n");

  return `# Surgeon Audit Report

**Project:** ${meta.project.name} | **Date:** ${meta.timestamp}
**Scope:** ${scopeLabel}
**Health Score:** ${summary.healthScore}/100

## Summary

| Severity | Count |
|----------|-------|
${severityTable}

**Fixable:** ${summary.fixable}/${summary.totalFindings} (${summary.autoFixable} auto-fixable)

## Findings

${findingsSection}

## Module Health

| Module | Score | Findings |
|--------|-------|----------|
${moduleTable}

## Stats
- Duration: ${(meta.duration / 1000).toFixed(1)}s
- Tokens used: ${meta.tokensUsed?.toLocaleString() ?? "N/A"}
`;
}

export async function generateMarkdown(scanResult: ScanResult, outputDir: string): Promise<void> {
  await fs.writeFile(path.join(outputDir, "audit.md"), generateMarkdownString(scanResult), "utf-8");
}
