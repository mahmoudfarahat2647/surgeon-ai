import type { Finding } from "./finding.js";

export type PackageManager = "npm" | "yarn" | "pnpm" | "bun";
export type ScanScope = "full" | "branch";
export type ScanDepth = "shallow" | "standard" | "deep";
export type NextjsRouter = "app" | "pages" | "both";

export interface ProjectInfo {
  name: string;
  languages: string[];
  frameworks: string[];
  packageManager: PackageManager;
  nodeVersion?: string;
  totalFiles: number;
  scannedFiles: number;
  /** Populated when Next.js is detected: which router convention the project uses. */
  nextjsRouter?: NextjsRouter;
}

export interface ScanMeta {
  version: string;
  timestamp: string;
  duration: number;
  scope: ScanScope;
  base?: string;
  changedFiles?: string[];
  mode: string;
  depth: ScanDepth;
  path: string;
  project: ProjectInfo;
  claudeModel: string;
  tokensUsed: number;
}

export interface ScanSummary {
  totalFindings: number;
  bySeverity: Record<string, number>;
  byMode: Record<string, number>;
  fixable: number;
  autoFixable: number;
  healthScore: number;
}

export interface ModuleScan {
  path: string;
  files: string[];
  findings: Finding[];
  healthScore: number;
}

export interface ScanResult {
  meta: ScanMeta;
  summary: ScanSummary;
  findings: Finding[];
  modules: ModuleScan[];
  crossModuleFindings: Finding[];
}
