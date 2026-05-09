import crypto from "crypto";
import type { Finding } from "../types/finding.js";

export function generateFindingId(finding: Omit<Finding, "id">): string {
  const input = `${finding.file}:${finding.line}:${finding.title}`;
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 12);
}

export function deduplicateFindings(findings: Finding[]): Finding[] {
  const seen = new Map<string, Finding>();

  for (const finding of findings) {
    const key = `${finding.file}:${finding.line}:${finding.title}`;
    if (!seen.has(key)) {
      const id = finding.id || generateFindingId(finding);
      seen.set(key, { ...finding, id });
    }
  }

  return [...seen.values()];
}
