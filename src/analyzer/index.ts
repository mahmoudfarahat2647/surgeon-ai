import { walkFiles, detectProject } from "../discovery/index.js";
import { buildDepGraph } from "../graph/index.js";
import { detectProfiles } from "../profiles/index.js";
import { auditChunk } from "./chunk-audit.js";
import { crossModulePass } from "./cross-module.js";
import { deduplicateFindings } from "./dedup.js";
import { runAgentPool, type AgentTask, type ProgressCallback } from "../bridge/pool.js";
import type { ScanResult, ScanMeta, ScanSummary, ModuleScan, ScanDepth } from "../types/scan.js";
import type { Finding } from "../types/finding.js";
import type { AuditMode } from "../profiles/types.js";
import type { SurgeonConfig } from "../types/config.js";

export interface AnalyzeOptions {
  projectPath: string;
  config: SurgeonConfig;
  mode: AuditMode | "full";
  depth: ScanDepth;
  scope: "full" | "branch";
  changedFiles?: string[];
  onProgress?: ProgressCallback;
}

function computeHealthScore(findings: Finding[]): number {
  let score = 100;
  for (const f of findings) {
    const penalty: Record<string, number> = { critical: 15, high: 8, medium: 4, low: 1, info: 0 };
    score -= penalty[f.severity] ?? 0;
  }
  return Math.max(0, Math.min(100, score));
}

function computeSummary(findings: Finding[]): ScanSummary {
  const bySeverity: Record<string, number> = {};
  const byMode: Record<string, number> = {};
  let fixable = 0;
  let autoFixable = 0;

  for (const f of findings) {
    bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
    byMode[f.mode] = (byMode[f.mode] ?? 0) + 1;
    if (f.fix) {
      fixable++;
      if (f.fix.confidence === "high") autoFixable++;
    }
  }

  return {
    totalFindings: findings.length,
    bySeverity,
    byMode,
    fixable,
    autoFixable,
    healthScore: computeHealthScore(findings),
  };
}

export async function analyze(options: AnalyzeOptions): Promise<ScanResult> {
  const start = Date.now();
  const {
    projectPath, config, mode, depth, scope, changedFiles, onProgress,
  } = options;

  // Phase 1: Discovery
  const project = await detectProject(projectPath);
  let files = await walkFiles(projectPath, config.include, config.exclude);

  if (scope === "branch" && changedFiles) {
    const changedSet = new Set(changedFiles);
    files = files.filter((f) => changedSet.has(f));
  }

  project.totalFiles = files.length;
  project.scannedFiles = files.length;

  // Phase 2 & 3: Dep Graph + Clustering
  const { clusters } = await buildDepGraph(projectPath, files);

  // Detect framework profiles
  const profiles = detectProfiles(project);
  const auditMode: AuditMode = mode === "full" ? "security" : mode as AuditMode;

  // Phase 4: Parallel Audit (orchestrator spawns 1 agent per chunk)
  const tasks: AgentTask<{ findings: Finding[]; healthScore: number }>[] = clusters.map(
    (chunk, i) => ({
      id: `chunk-${i}`,
      label: chunk.id,
      run: async () => {
        const response = await auditChunk(projectPath, chunk, profiles, auditMode, depth);
        return { findings: response.findings, healthScore: response.healthScore };
      },
    }),
  );

  const agentResults = await runAgentPool(tasks, { onProgress });

  // Aggregate per-module results
  const modules: ModuleScan[] = [];
  let allFindings: Finding[] = [];

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];
    const result = agentResults.find((r) => r.id === `chunk-${i}`);
    const findings = result?.result?.findings ?? [];
    const healthScore = result?.result?.healthScore ?? 50;

    modules.push({
      path: cluster.id,
      files: cluster.files.map((f) => f.path),
      findings,
      healthScore,
    });

    allFindings.push(...findings);
  }

  // Phase 5: Cross-Module Pass
  let crossModuleFindings: Finding[] = [];
  if (clusters.length > 1) {
    const crossResult = await crossModulePass(projectPath, modules, allFindings, project.name);
    crossModuleFindings = crossResult.findings;
  }

  // Deduplicate and assign IDs
  allFindings = deduplicateFindings([...allFindings, ...crossModuleFindings]);
  crossModuleFindings = deduplicateFindings(crossModuleFindings);

  const duration = Date.now() - start;

  const meta: ScanMeta = {
    version: "0.1.0",
    timestamp: new Date().toISOString(),
    duration,
    scope,
    base: scope === "branch" ? config.base : undefined,
    changedFiles: scope === "branch" ? changedFiles : undefined,
    mode,
    depth,
    path: projectPath,
    project,
    claudeModel: "claude",
    tokensUsed: 0,
  };

  return {
    meta,
    summary: computeSummary(allFindings),
    findings: allFindings.filter((f) => !crossModuleFindings.some((cf) => cf.id === f.id)),
    modules,
    crossModuleFindings,
  };
}
