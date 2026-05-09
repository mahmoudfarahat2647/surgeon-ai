export type { Finding, ProposedFix, FileDiff, Severity, AuditMode as FindingMode, Confidence } from "./types/finding.js";
export type { ScanResult, ScanMeta, ScanSummary, ProjectInfo, ModuleScan } from "./types/scan.js";
export type { SurgeonConfig } from "./types/config.js";
export type { DepGraph, FileNode, Edge } from "./types/graph.js";
export type { FixPlan, FixResult, FixOptions } from "./types/fix.js";
export { analyze } from "./analyzer/index.js";
export { generateReports } from "./reporter/index.js";
export { createProgram } from "./cli/index.js";
