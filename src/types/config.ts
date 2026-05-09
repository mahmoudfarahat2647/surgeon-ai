import type { ScanDepth } from "./scan.js";

export interface FixConfig {
  autoApproveConfidence: "high" | "medium" | "low";
  branchPrefix: string;
}

export interface SurgeonConfig {
  base: string;
  depth: ScanDepth;
  exclude: string[];
  include: string[];
  mode: string;
  output: string;
  fix: FixConfig;
  profiles: Record<string, boolean>;
}
