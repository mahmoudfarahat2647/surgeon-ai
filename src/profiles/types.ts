import type { ProjectInfo } from "../types/scan.js";

export type AuditMode = "security" | "performance" | "reliability" | "maintainability" | "tests" | "full";

export interface Pitfall {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  codePattern?: string;
  references: string[];
}

export interface FrameworkProfile {
  id: string;
  name: string;
  detect: (project: ProjectInfo) => boolean;
  promptFragments: Partial<Record<AuditMode, string>>;
  filePatterns: string[];
  knownPitfalls: Pitfall[];
}
