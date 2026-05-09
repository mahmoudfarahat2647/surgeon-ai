import type { Finding } from "./finding.js";

export interface FixOptions {
  scope: "full" | "branch";
  autoApprove: boolean;
  confidenceThreshold: "high" | "medium" | "low";
  selectedIds?: string[];
  dryRun: boolean;
}

export interface PlannedFix {
  findingId: string;
  finding: Finding;
  priority: number;
  approval: "auto" | "prompt";
}

export interface SkippedFix {
  findingId: string;
  reason: "no-fix-available" | "below-confidence" | "out-of-scope" | "user-deselected";
}

export interface FixPlan {
  scanId: string;
  scope: "full" | "branch";
  mode: string;
  fixes: PlannedFix[];
  skipped: SkippedFix[];
  order: string[];
}

export interface FixResult {
  findingId: string;
  status: "applied" | "skipped" | "failed" | "rejected";
  filesModified: string[];
  error?: string;
  userApproved?: boolean;
}

export interface BranchGuard {
  originalBranch: string;
  fixBranch: string;
  createdAt: string;
  stashId?: string;
  create(): Promise<void>;
  rollback(): Promise<void>;
  complete(): Promise<void>;
}

export interface CommitInfo {
  committed: boolean;
  branch?: string;
  commitCount?: number;
  fixCount?: number;
  message?: string;
}

export interface ValidationReport {
  syntaxCheck: { passed: boolean; errors: string[] };
  typeCheck: { passed: boolean; errors: string[] };
  lintCheck: { passed: boolean; errors: string[] };
  testRun: { passed: boolean; failures: string[] };
  overall: "pass" | "partial" | "fail";
}
