export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type AuditMode = "security" | "performance" | "reliability" | "maintainability" | "tests";
export type Confidence = "high" | "medium" | "low";

export interface FileDiff {
  file: string;
  oldCode: string;
  newCode: string;
  startLine: number;
  endLine: number;
}

export interface ProposedFix {
  description: string;
  diff: FileDiff[];
  confidence: Confidence;
  breaking: boolean;
  testSuggestion?: string;
}

export interface Finding {
  id: string;
  file: string;
  line: number;
  endLine?: number;
  column?: number;
  severity: Severity;
  mode: AuditMode;
  title: string;
  description: string;
  evidence: string;
  suggestion: string;
  fix?: ProposedFix;
  confidence: Confidence;
  framework?: string;
  rule?: string;
  references?: string[];
}
