# Surgeon AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `surgeon-ai`, an AI-powered codebase audit & repair CLI (`srgn`) that scans codebases using Claude Code, produces rich reports, and safely applies fixes on isolated branches.

**Architecture:** Orchestrator pattern — Surgeon breaks a codebase into chunks via dependency graph analysis, spawns parallel `claude -p` calls (one per chunk), aggregates findings, and generates JSON/Markdown/HTML reports. Fixes are applied on isolated git branches with confidence-tiered approval and per-fix rollback.

**Tech Stack:** Node.js 20+, TypeScript, ESM, Commander.js, Ink 5 (TUI), simple-git, fast-glob, p-limit, Zod, Vitest, tsup, pnpm

---

## File Map

Every file this plan creates, grouped by module:

```
bin/srgn.ts                           — CLI entry point (#!/usr/bin/env node)

src/index.ts                          — Public API re-exports

src/types/finding.ts                  — Finding, ProposedFix, FileDiff types
src/types/scan.ts                     — ScanResult, ScanMeta, ScanSummary, ProjectInfo, ModuleScan
src/types/config.ts                   — SurgeonConfig type
src/types/graph.ts                    — DepGraph, FileNode, Edge, ExportInfo
src/types/fix.ts                      — FixPlan, PlannedFix, FixResult, FixOptions, BranchGuard

src/config/defaults.ts                — Default config values
src/config/schema.ts                  — Zod schema for .surgeon/config.json
src/config/index.ts                   — loadConfig(): merge file config + CLI flags

src/git/index.ts                      — Git helper facade (re-exports)
src/git/diff.ts                       — getChangedFiles(base): string[]
src/git/branch.ts                     — createFixBranch(), getCurrentBranch(), deleteBranch()
src/git/stash.ts                      — autoStash(), restoreStash()

src/discovery/walker.ts               — walkFiles(): discover source files via fast-glob
src/discovery/detector.ts             — detectProject(): detect languages, frameworks, package manager
src/discovery/filters.ts              — applyFilters(): include/exclude/gitignore logic
src/discovery/index.ts                — discover(): full discovery pipeline

src/graph/parser.ts                   — parseImports(), parseExports(): regex-based extraction
src/graph/resolver.ts                 — resolveImport(): tsconfig paths, relative, extensions
src/graph/builder.ts                  — buildGraph(): adjacency list from parsed files
src/graph/cycles.ts                   — detectCycles(): DFS cycle detection
src/graph/clusterer.ts                — clusterModules(): directory + dependency clustering
src/graph/index.ts                    — buildDepGraph(): full graph pipeline

src/bridge/spawner.ts                 — spawnClaude(): exec `claude -p` with prompt
src/bridge/parser.ts                  — parseClaudeResponse(): validate JSON against Zod schema
src/bridge/pool.ts                    — AgentPool: orchestrator-driven concurrency
src/bridge/retry.ts                   — withRetry(): exponential backoff wrapper
src/bridge/index.ts                   — ClaudeBridge facade

src/profiles/types.ts                 — FrameworkProfile, Pitfall, AuditMode types
src/profiles/base.ts                  — baseProfile: universal audit rules
src/profiles/node.ts                  — nodeProfile
src/profiles/typescript.ts            — typescriptProfile
src/profiles/react.ts                 — reactProfile
src/profiles/nextjs.ts                — nextjsProfile
src/profiles/express.ts               — expressProfile
src/profiles/fastify.ts               — fastifyProfile
src/profiles/nestjs.ts                — nestjsProfile
src/profiles/testing.ts               — testingProfile
src/profiles/index.ts                 — detectProfiles(), getProfileFragments()

src/analyzer/prompt.ts                — buildChunkPrompt(), buildCrossModulePrompt()
src/analyzer/chunk-audit.ts           — auditChunk(): send one chunk to Claude
src/analyzer/cross-module.ts          — crossModulePass(): architectural review
src/analyzer/dedup.ts                 — deduplicateFindings()
src/analyzer/index.ts                 — analyze(): full scan orchestrator

src/fixer/planner.ts                  — planFixes(): filter, classify, order
src/fixer/guard.ts                    — BranchGuardImpl: create/rollback/complete
src/fixer/applier.ts                  — applyFixes(): per-fix application + rollback
src/fixer/validator.ts                — validate(): syntax, tsc, eslint, test
src/fixer/committer.ts                — commitFixes(): group commits by mode
src/fixer/index.ts                    — fix(): full fix pipeline

src/reporter/json.ts                  — generateJson()
src/reporter/markdown.ts              — generateMarkdown()
src/reporter/html/template.ts         — HTML template string
src/reporter/html/styles.ts           — Inlined CSS
src/reporter/html/scripts.ts          — Inlined JS (sort, filter, search)
src/reporter/html/charts.ts           — buildSeverityBars(), buildModuleHeatmap()
src/reporter/html/generator.ts        — generateHtml()
src/reporter/history.ts               — saveToHistory()
src/reporter/index.ts                 — generateReports()

src/tui/state.ts                      — React context + types
src/tui/hooks/useKeyboard.ts          — keyboard navigation
src/tui/hooks/useFilter.ts            — filter logic
src/tui/hooks/useScroll.ts            — viewport scrolling
src/tui/components/KeyHints.tsx        — bottom keyboard shortcut bar
src/tui/components/HealthBar.tsx       — visual health score
src/tui/components/FindingRow.tsx      — single finding row
src/tui/components/FilterBar.tsx       — filter controls
src/tui/components/CodeBlock.tsx       — syntax-highlighted code
src/tui/components/DiffView.tsx        — unified diff display
src/tui/components/SearchInput.tsx     — fuzzy search
src/tui/views/ListView.tsx             — findings list view
src/tui/views/DetailView.tsx           — single finding detail
src/tui/views/SummaryView.tsx          — pre-fix confirmation
src/tui/App.tsx                        — root TUI component

src/cli/output.ts                     — terminal formatting helpers (spinner, colors, tables)
src/cli/flags.ts                       — shared flag definitions
src/cli/commands/init.ts               — srgn init
src/cli/commands/scan.ts               — srgn scan
src/cli/commands/fix.ts                — srgn fix
src/cli/commands/review.ts             — srgn review (launches TUI)
src/cli/commands/report.ts             — srgn report
src/cli/index.ts                       — Commander program definition

tests/fixtures/sample-project/         — minimal project with deliberate bugs
tests/fixtures/claude-responses/       — mock Claude response JSON
tests/unit/graph/parser.test.ts
tests/unit/graph/resolver.test.ts
tests/unit/graph/cycles.test.ts
tests/unit/graph/clusterer.test.ts
tests/unit/bridge/parser.test.ts
tests/unit/bridge/pool.test.ts
tests/unit/fixer/planner.test.ts
tests/unit/fixer/applier.test.ts
tests/unit/fixer/guard.test.ts
tests/unit/profiles/detector.test.ts
tests/unit/reporter/markdown.test.ts
tests/unit/reporter/json.test.ts
tests/unit/config/schema.test.ts
tests/unit/discovery/detector.test.ts
tests/integration/scan.test.ts
tests/integration/fix.test.ts
tests/integration/branch-scan.test.ts
```

---

## Task 1: Project Scaffolding & Build Pipeline

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`
- Create: `eslint.config.js`
- Create: `.prettierrc`
- Create: `.gitignore`
- Create: `bin/srgn.ts`
- Create: `src/index.ts`

- [ ] **Step 1: Initialize pnpm project**

```bash
cd D:/surgeon
pnpm init
```

- [ ] **Step 2: Install dependencies**

```bash
pnpm add commander ink react simple-git fast-glob p-limit ora chalk zod
pnpm add -D typescript tsup vitest @types/react @types/node eslint prettier
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": ".",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*", "bin/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 4: Create `tsup.config.ts`**

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["bin/srgn.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,
  splitting: false,
  sourcemap: true,
  dts: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
```

- [ ] **Step 5: Create `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

- [ ] **Step 6: Create `eslint.config.js`**

```javascript
import tseslint from "typescript-eslint";

export default tseslint.config(
  tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    ignores: ["dist/", "node_modules/"],
  }
);
```

- [ ] **Step 7: Create `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

- [ ] **Step 8: Create `.gitignore`**

```
node_modules/
dist/
.surgeon/
surgeon-tests/
*.tsbuildinfo
```

- [ ] **Step 9: Update `package.json` fields**

Add to `package.json`:

```json
{
  "name": "surgeon-ai",
  "version": "0.1.0",
  "description": "AI-Powered Codebase Audit & Repair CLI",
  "type": "module",
  "bin": {
    "srgn": "./dist/srgn.js"
  },
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest",
    "test:run": "vitest run",
    "lint": "eslint .",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "pnpm run build"
  },
  "keywords": ["audit", "codebase", "security", "ai", "claude", "code-review", "cli"],
  "license": "MIT"
}
```

- [ ] **Step 10: Create `bin/srgn.ts`**

```typescript
import { createProgram } from "../src/cli/index.js";

const program = createProgram();
program.parse(process.argv);
```

- [ ] **Step 11: Create `src/index.ts`**

```typescript
export type { Finding, ProposedFix, FileDiff } from "./types/finding.js";
export type { ScanResult, ScanMeta, ScanSummary, ProjectInfo, ModuleScan } from "./types/scan.js";
export type { SurgeonConfig } from "./types/config.js";
```

- [ ] **Step 12: Verify build compiles**

```bash
pnpm run build
```

Expected: tsup creates `dist/srgn.js` without errors.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: scaffold project with build pipeline, tsup, vitest, eslint"
```

---

## Task 2: Type Definitions

**Files:**
- Create: `src/types/finding.ts`
- Create: `src/types/scan.ts`
- Create: `src/types/config.ts`
- Create: `src/types/graph.ts`
- Create: `src/types/fix.ts`

- [ ] **Step 1: Create `src/types/finding.ts`**

```typescript
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
```

- [ ] **Step 2: Create `src/types/scan.ts`**

```typescript
import type { Finding } from "./finding.js";

export type PackageManager = "npm" | "yarn" | "pnpm" | "bun";
export type ScanScope = "full" | "branch";
export type ScanDepth = "shallow" | "standard" | "deep";

export interface ProjectInfo {
  name: string;
  languages: string[];
  frameworks: string[];
  packageManager: PackageManager;
  nodeVersion?: string;
  totalFiles: number;
  scannedFiles: number;
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
```

- [ ] **Step 3: Create `src/types/config.ts`**

```typescript
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
```

- [ ] **Step 4: Create `src/types/graph.ts`**

```typescript
export type SourceLanguage = "ts" | "tsx" | "js" | "jsx" | "mjs" | "cjs";
export type EdgeType = "static" | "dynamic" | "require" | "re-export";

export interface ExportInfo {
  name: string;
  type: "function" | "class" | "variable" | "type" | "interface" | "enum";
  line: number;
}

export interface FileNode {
  path: string;
  imports: string[];
  importedBy: string[];
  exports: ExportInfo[];
  moduleId: string;
  depth: number;
  size: number;
  language: SourceLanguage;
}

export interface Edge {
  from: string;
  to: string;
  type: EdgeType;
  specifiers: string[];
}

export interface DepGraph {
  nodes: Map<string, FileNode>;
  edges: Edge[];
  entryPoints: string[];
  leafNodes: string[];
  cycles: string[][];
}

export interface ModuleCluster {
  id: string;
  files: FileNode[];
  internalEdges: Edge[];
  externalImports: Edge[];
  externalExports: ExportInfo[];
  scanOrder: number;
}
```

- [ ] **Step 5: Create `src/types/fix.ts`**

```typescript
import type { Finding } from "./finding.js";
import type { ScanResult } from "./scan.js";

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
```

- [ ] **Step 6: Verify types compile**

```bash
pnpm run typecheck
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/types/
git commit -m "feat: add all type definitions (finding, scan, config, graph, fix)"
```

---

## Task 3: Config Module

**Files:**
- Create: `src/config/defaults.ts`
- Create: `src/config/schema.ts`
- Create: `src/config/index.ts`
- Test: `tests/unit/config/schema.test.ts`

- [ ] **Step 1: Write failing test for config schema validation**

Create `tests/unit/config/schema.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { configSchema, parseConfig } from "@/config/schema.js";
import { DEFAULT_CONFIG } from "@/config/defaults.js";

describe("configSchema", () => {
  it("validates a complete valid config", () => {
    const result = configSchema.safeParse(DEFAULT_CONFIG);
    expect(result.success).toBe(true);
  });

  it("rejects invalid depth value", () => {
    const result = configSchema.safeParse({ ...DEFAULT_CONFIG, depth: "extreme" });
    expect(result.success).toBe(false);
  });

  it("applies defaults for missing optional fields", () => {
    const result = parseConfig({});
    expect(result.base).toBe("main");
    expect(result.depth).toBe("standard");
    expect(result.output).toBe("surgeon-tests");
  });

  it("merges partial config with defaults", () => {
    const result = parseConfig({ base: "develop", depth: "deep" });
    expect(result.base).toBe("develop");
    expect(result.depth).toBe("deep");
    expect(result.output).toBe("surgeon-tests");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run tests/unit/config/schema.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Create `src/config/defaults.ts`**

```typescript
import type { SurgeonConfig } from "../types/config.js";

export const DEFAULT_CONFIG: SurgeonConfig = {
  base: "main",
  depth: "standard",
  exclude: ["node_modules", "dist", ".next", "coverage", "*.min.js"],
  include: [],
  mode: "full",
  output: "surgeon-tests",
  fix: {
    autoApproveConfidence: "high",
    branchPrefix: "surgeon/fix",
  },
  profiles: {},
};
```

- [ ] **Step 4: Create `src/config/schema.ts`**

```typescript
import { z } from "zod";
import { DEFAULT_CONFIG } from "./defaults.js";
import type { SurgeonConfig } from "../types/config.js";

export const configSchema = z.object({
  base: z.string().default(DEFAULT_CONFIG.base),
  depth: z.enum(["shallow", "standard", "deep"]).default(DEFAULT_CONFIG.depth),
  exclude: z.array(z.string()).default(DEFAULT_CONFIG.exclude),
  include: z.array(z.string()).default(DEFAULT_CONFIG.include),
  mode: z.string().default(DEFAULT_CONFIG.mode),
  output: z.string().default(DEFAULT_CONFIG.output),
  fix: z
    .object({
      autoApproveConfidence: z.enum(["high", "medium", "low"]).default("high"),
      branchPrefix: z.string().default("surgeon/fix"),
    })
    .default(DEFAULT_CONFIG.fix),
  profiles: z.record(z.string(), z.boolean()).default({}),
});

export function parseConfig(raw: unknown): SurgeonConfig {
  return configSchema.parse(raw ?? {});
}
```

- [ ] **Step 5: Create `src/config/index.ts`**

```typescript
import fs from "fs/promises";
import path from "path";
import { parseConfig } from "./schema.js";
import type { SurgeonConfig } from "../types/config.js";

export { parseConfig } from "./schema.js";
export { DEFAULT_CONFIG } from "./defaults.js";

export async function loadConfig(projectPath: string): Promise<SurgeonConfig> {
  const configPath = path.join(projectPath, ".surgeon", "config.json");
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    return parseConfig(JSON.parse(raw));
  } catch {
    return parseConfig({});
  }
}

export function mergeCliFlags(
  config: SurgeonConfig,
  flags: Partial<SurgeonConfig>,
): SurgeonConfig {
  return {
    ...config,
    ...Object.fromEntries(Object.entries(flags).filter(([_, v]) => v !== undefined)),
    fix: { ...config.fix, ...flags.fix },
  };
}
```

- [ ] **Step 6: Run tests**

```bash
pnpm vitest run tests/unit/config/schema.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/config/ tests/unit/config/
git commit -m "feat: config module with Zod schema, defaults, and file loading"
```

---

## Task 4: Git Helper Module

**Files:**
- Create: `src/git/diff.ts`
- Create: `src/git/branch.ts`
- Create: `src/git/stash.ts`
- Create: `src/git/index.ts`

- [ ] **Step 1: Create `src/git/diff.ts`**

```typescript
import simpleGit from "simple-git";

export async function getChangedFiles(
  projectPath: string,
  baseBranch: string,
): Promise<string[]> {
  const git = simpleGit(projectPath);
  const result = await git.diff(["--name-only", baseBranch]);
  return result
    .split("\n")
    .map((f) => f.trim())
    .filter((f) => f.length > 0);
}

export async function getBaseBranch(projectPath: string): Promise<string> {
  const git = simpleGit(projectPath);
  const branches = await git.branch();
  if (branches.all.includes("main")) return "main";
  if (branches.all.includes("master")) return "master";
  return branches.all[0] ?? "main";
}
```

- [ ] **Step 2: Create `src/git/branch.ts`**

```typescript
import simpleGit from "simple-git";

export async function getCurrentBranch(projectPath: string): Promise<string | null> {
  const git = simpleGit(projectPath);
  const branch = await git.branch();
  return branch.current || null;
}

export async function createFixBranch(
  projectPath: string,
  prefix: string,
): Promise<string> {
  const git = simpleGit(projectPath);
  const timestamp = Math.floor(Date.now() / 1000);
  let branchName = `${prefix}-${timestamp}`;

  const branches = await git.branch();
  let counter = 1;
  while (branches.all.includes(branchName)) {
    branchName = `${prefix}-${timestamp}-${counter}`;
    counter++;
  }

  await git.checkoutLocalBranch(branchName);
  return branchName;
}

export async function switchBranch(projectPath: string, branch: string): Promise<void> {
  const git = simpleGit(projectPath);
  await git.checkout(branch);
}

export async function deleteBranch(projectPath: string, branch: string): Promise<void> {
  const git = simpleGit(projectPath);
  await git.deleteLocalBranch(branch, true);
}
```

- [ ] **Step 3: Create `src/git/stash.ts`**

```typescript
import simpleGit from "simple-git";

export async function autoStash(projectPath: string): Promise<string | null> {
  const git = simpleGit(projectPath);
  const status = await git.status();

  if (status.files.length === 0) return null;

  await git.stash(["push", "-m", "surgeon: auto-stash before fix"]);
  return "surgeon-stash";
}

export async function restoreStash(projectPath: string): Promise<void> {
  const git = simpleGit(projectPath);
  try {
    await git.stash(["pop"]);
  } catch {
    // Stash may have already been applied or was empty
  }
}
```

- [ ] **Step 4: Create `src/git/index.ts`**

```typescript
export { getChangedFiles, getBaseBranch } from "./diff.js";
export { getCurrentBranch, createFixBranch, switchBranch, deleteBranch } from "./branch.js";
export { autoStash, restoreStash } from "./stash.js";
```

- [ ] **Step 5: Verify types compile**

```bash
pnpm run typecheck
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/git/
git commit -m "feat: git helper module (diff, branch, stash operations)"
```

---

## Task 5: Discovery Module

**Files:**
- Create: `src/discovery/walker.ts`
- Create: `src/discovery/detector.ts`
- Create: `src/discovery/filters.ts`
- Create: `src/discovery/index.ts`
- Test: `tests/unit/discovery/detector.test.ts`

- [ ] **Step 1: Write failing test for project detection**

Create `tests/unit/discovery/detector.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { detectFromPackageJson } from "@/discovery/detector.js";

describe("detectFromPackageJson", () => {
  it("detects Next.js from dependencies", () => {
    const result = detectFromPackageJson({
      name: "my-app",
      dependencies: { next: "14.0.0", react: "18.0.0" },
    });
    expect(result.frameworks).toContain("next");
    expect(result.frameworks).toContain("react");
  });

  it("detects Express from dependencies", () => {
    const result = detectFromPackageJson({
      name: "api",
      dependencies: { express: "4.18.0" },
    });
    expect(result.frameworks).toContain("express");
    expect(result.frameworks).not.toContain("react");
  });

  it("detects package manager from lockfile hints", () => {
    const result = detectFromPackageJson({ name: "app" }, "pnpm-lock.yaml");
    expect(result.packageManager).toBe("pnpm");
  });

  it("returns empty frameworks for bare project", () => {
    const result = detectFromPackageJson({ name: "bare" });
    expect(result.frameworks).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run tests/unit/discovery/detector.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create `src/discovery/detector.ts`**

```typescript
import fs from "fs/promises";
import path from "path";
import type { ProjectInfo, PackageManager } from "../types/scan.js";

const FRAMEWORK_DEPS: Record<string, string> = {
  next: "next",
  react: "react",
  express: "express",
  fastify: "fastify",
  "@nestjs/core": "nestjs",
};

export function detectFromPackageJson(
  pkg: { name?: string; dependencies?: Record<string, string>; devDependencies?: Record<string, string> },
  lockfileName?: string,
): { frameworks: string[]; packageManager: PackageManager } {
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  const frameworks: string[] = [];

  for (const [dep, frameworkId] of Object.entries(FRAMEWORK_DEPS)) {
    if (allDeps[dep]) {
      frameworks.push(frameworkId);
    }
  }

  let packageManager: PackageManager = "npm";
  if (lockfileName) {
    if (lockfileName.includes("pnpm")) packageManager = "pnpm";
    else if (lockfileName.includes("yarn")) packageManager = "yarn";
    else if (lockfileName.includes("bun")) packageManager = "bun";
  }

  return { frameworks, packageManager };
}

export async function detectProject(projectPath: string): Promise<ProjectInfo> {
  let pkg: Record<string, unknown> = {};
  let lockfileName: string | undefined;

  try {
    const raw = await fs.readFile(path.join(projectPath, "package.json"), "utf-8");
    pkg = JSON.parse(raw);
  } catch {
    // No package.json
  }

  const lockfiles = ["pnpm-lock.yaml", "yarn.lock", "bun.lockb", "package-lock.json"];
  for (const lf of lockfiles) {
    try {
      await fs.access(path.join(projectPath, lf));
      lockfileName = lf;
      break;
    } catch {
      // Not found
    }
  }

  const { frameworks, packageManager } = detectFromPackageJson(pkg as Record<string, unknown>, lockfileName);

  const languages: string[] = [];
  try {
    await fs.access(path.join(projectPath, "tsconfig.json"));
    languages.push("typescript");
  } catch {
    // No tsconfig
  }
  languages.push("javascript");

  return {
    name: (pkg.name as string) ?? path.basename(projectPath),
    languages,
    frameworks,
    packageManager,
    totalFiles: 0,
    scannedFiles: 0,
  };
}
```

- [ ] **Step 4: Create `src/discovery/walker.ts`**

```typescript
import fg from "fast-glob";
import path from "path";

const SOURCE_EXTENSIONS = ["ts", "tsx", "js", "jsx", "mjs", "cjs"];

export async function walkFiles(
  projectPath: string,
  include: string[],
  exclude: string[],
): Promise<string[]> {
  const patterns =
    include.length > 0
      ? include
      : SOURCE_EXTENSIONS.map((ext) => `**/*.${ext}`);

  const ignorePatterns = [
    "**/node_modules/**",
    "**/dist/**",
    "**/.next/**",
    "**/coverage/**",
    "**/*.min.js",
    ...exclude,
  ];

  const files = await fg(patterns, {
    cwd: projectPath,
    ignore: ignorePatterns,
    absolute: false,
    dot: false,
  });

  return files.sort();
}
```

- [ ] **Step 5: Create `src/discovery/filters.ts`**

```typescript
export function filterByLanguage(files: string[], lang?: string): string[] {
  if (!lang) return files;

  const extMap: Record<string, string[]> = {
    ts: [".ts", ".tsx"],
    js: [".js", ".jsx", ".mjs", ".cjs"],
    py: [".py"],
  };

  const exts = extMap[lang];
  if (!exts) return files;
  return files.filter((f) => exts.some((ext) => f.endsWith(ext)));
}

export function filterByChangedFiles(files: string[], changedFiles: string[]): string[] {
  const changed = new Set(changedFiles);
  return files.filter((f) => changed.has(f));
}
```

- [ ] **Step 6: Create `src/discovery/index.ts`**

```typescript
export { walkFiles } from "./walker.js";
export { detectProject, detectFromPackageJson } from "./detector.js";
export { filterByLanguage, filterByChangedFiles } from "./filters.js";
```

- [ ] **Step 7: Run tests**

```bash
pnpm vitest run tests/unit/discovery/detector.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/discovery/ tests/unit/discovery/
git commit -m "feat: discovery module (file walking, project detection, filters)"
```

---

## Task 6: Dependency Graph — Parser & Resolver

**Files:**
- Create: `src/graph/parser.ts`
- Create: `src/graph/resolver.ts`
- Test: `tests/unit/graph/parser.test.ts`
- Test: `tests/unit/graph/resolver.test.ts`

- [ ] **Step 1: Write failing test for import parsing**

Create `tests/unit/graph/parser.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseImports, parseExports } from "@/graph/parser.js";

describe("parseImports", () => {
  it("parses ESM static imports", () => {
    const code = `import { foo } from "./utils";`;
    const result = parseImports(code);
    expect(result).toEqual([{ specifier: "./utils", type: "static", line: 1 }]);
  });

  it("parses dynamic imports", () => {
    const code = `const mod = await import("./lazy");`;
    const result = parseImports(code);
    expect(result).toEqual([{ specifier: "./lazy", type: "dynamic", line: 1 }]);
  });

  it("parses require calls", () => {
    const code = `const config = require("./config");`;
    const result = parseImports(code);
    expect(result).toEqual([{ specifier: "./config", type: "require", line: 1 }]);
  });

  it("parses re-exports", () => {
    const code = `export { helper } from "./helper";`;
    const result = parseImports(code);
    expect(result).toEqual([{ specifier: "./helper", type: "re-export", line: 1 }]);
  });

  it("parses type-only imports", () => {
    const code = `import type { User } from "./types";`;
    const result = parseImports(code);
    expect(result).toEqual([{ specifier: "./types", type: "static", line: 1 }]);
  });

  it("skips bare specifiers (npm packages)", () => {
    const code = `import express from "express";\nimport { foo } from "./local";`;
    const result = parseImports(code);
    expect(result).toHaveLength(1);
    expect(result[0].specifier).toBe("./local");
  });

  it("handles multiple imports in one file", () => {
    const code = `import { a } from "./a";\nimport { b } from "../b";\nconst c = require("./c");`;
    const result = parseImports(code);
    expect(result).toHaveLength(3);
  });
});

describe("parseExports", () => {
  it("parses named function export", () => {
    const code = `export function loginUser() {}`;
    const result = parseExports(code);
    expect(result[0].name).toBe("loginUser");
    expect(result[0].type).toBe("function");
  });

  it("parses default export", () => {
    const code = `export default class AuthService {}`;
    const result = parseExports(code);
    expect(result[0].name).toBe("AuthService");
    expect(result[0].type).toBe("class");
  });

  it("parses const export", () => {
    const code = `export const MAX_RETRIES = 3;`;
    const result = parseExports(code);
    expect(result[0].name).toBe("MAX_RETRIES");
    expect(result[0].type).toBe("variable");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run tests/unit/graph/parser.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create `src/graph/parser.ts`**

```typescript
import type { ExportInfo, EdgeType } from "../types/graph.js";

export interface ParsedImport {
  specifier: string;
  type: EdgeType;
  line: number;
}

function getLineNumber(content: string, index: number): number {
  return content.slice(0, index).split("\n").length;
}

function isBareSpecifier(specifier: string): boolean {
  return !specifier.startsWith(".") && !specifier.startsWith("/") && !specifier.startsWith("@/") && !specifier.startsWith("~/");
}

export function parseImports(content: string): ParsedImport[] {
  const imports: ParsedImport[] = [];

  const patterns: Array<{ regex: RegExp; type: EdgeType }> = [
    {
      regex: /import\s+(?:type\s+)?(?:(?:\{[^}]*\}|[\w*]+(?:\s*,\s*\{[^}]*\})?)\s+from\s+)?['"]([^'"]+)['"]/g,
      type: "static",
    },
    {
      regex: /import\(\s*['"]([^'"]+)['"]\s*\)/g,
      type: "dynamic",
    },
    {
      regex: /require\(\s*['"]([^'"]+)['"]\s*\)/g,
      type: "require",
    },
    {
      regex: /export\s+(?:\{[^}]*\}|\*)\s+from\s+['"]([^'"]+)['"]/g,
      type: "re-export",
    },
  ];

  for (const { regex, type } of patterns) {
    for (const match of content.matchAll(regex)) {
      const specifier = match[1];
      if (isBareSpecifier(specifier)) continue;
      imports.push({
        specifier,
        type,
        line: getLineNumber(content, match.index!),
      });
    }
  }

  return imports;
}

export function parseExports(content: string): ExportInfo[] {
  const exports: ExportInfo[] = [];

  const namedPattern =
    /export\s+(?:async\s+)?(function|class|const|let|var|enum|interface|type)\s+([\w]+)/g;
  for (const match of content.matchAll(namedPattern)) {
    const kind = match[1];
    const name = match[2];
    const typeMap: Record<string, ExportInfo["type"]> = {
      function: "function",
      class: "class",
      const: "variable",
      let: "variable",
      var: "variable",
      enum: "enum",
      interface: "interface",
      type: "type",
    };
    exports.push({
      name,
      type: typeMap[kind] ?? "variable",
      line: getLineNumber(content, match.index!),
    });
  }

  const defaultPattern = /export\s+default\s+(?:async\s+)?(?:function|class)\s*([\w]*)/g;
  for (const match of content.matchAll(defaultPattern)) {
    exports.push({
      name: match[1] || "default",
      type: match[0].includes("class") ? "class" : "function",
      line: getLineNumber(content, match.index!),
    });
  }

  return exports;
}
```

- [ ] **Step 4: Run parser tests**

```bash
pnpm vitest run tests/unit/graph/parser.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Write failing test for import resolution**

Create `tests/unit/graph/resolver.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { resolveImport, type ResolverConfig } from "@/graph/resolver.js";

describe("resolveImport", () => {
  const config: ResolverConfig = {
    aliases: { "@/": "src/" },
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    projectPath: "/project",
    fileExists: (p: string) => {
      const existing = new Set([
        "/project/src/utils.ts",
        "/project/src/auth/login.ts",
        "/project/src/components/index.tsx",
      ]);
      return existing.has(p);
    },
  };

  it("resolves relative import with extension probe", () => {
    const result = resolveImport("./utils", "/project/src/index.ts", config);
    expect(result).toBe("src/utils.ts");
  });

  it("resolves tsconfig path alias", () => {
    const result = resolveImport("@/auth/login", "/project/src/index.ts", config);
    expect(result).toBe("src/auth/login.ts");
  });

  it("resolves index file in directory", () => {
    const result = resolveImport("./components", "/project/src/index.ts", config);
    expect(result).toBe("src/components/index.tsx");
  });

  it("returns null for unresolvable import", () => {
    const result = resolveImport("./nonexistent", "/project/src/index.ts", config);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
pnpm vitest run tests/unit/graph/resolver.test.ts
```

Expected: FAIL.

- [ ] **Step 7: Create `src/graph/resolver.ts`**

```typescript
import path from "path";

export interface ResolverConfig {
  aliases: Record<string, string>;
  extensions: string[];
  projectPath: string;
  fileExists: (absolutePath: string) => boolean;
}

export function resolveImport(
  specifier: string,
  fromFile: string,
  config: ResolverConfig,
): string | null {
  let resolved = specifier;

  // Apply aliases
  for (const [prefix, replacement] of Object.entries(config.aliases)) {
    if (resolved.startsWith(prefix)) {
      resolved = resolved.replace(prefix, replacement);
      break;
    }
  }

  // Resolve to absolute path
  let basePath: string;
  if (resolved.startsWith(".")) {
    basePath = path.resolve(path.dirname(fromFile), resolved);
  } else {
    basePath = path.resolve(config.projectPath, resolved);
  }

  // Try direct match with extensions
  for (const ext of config.extensions) {
    const candidate = basePath + ext;
    if (config.fileExists(candidate)) {
      return path.relative(config.projectPath, candidate);
    }
  }

  // Try index files
  for (const ext of config.extensions) {
    const candidate = path.join(basePath, `index${ext}`);
    if (config.fileExists(candidate)) {
      return path.relative(config.projectPath, candidate);
    }
  }

  return null;
}

export async function loadResolverConfig(projectPath: string): Promise<{
  aliases: Record<string, string>;
}> {
  const fs = await import("fs/promises");
  const aliases: Record<string, string> = {};

  try {
    const raw = await fs.readFile(path.join(projectPath, "tsconfig.json"), "utf-8");
    // Strip comments for JSON parsing
    const cleaned = raw.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    const tsconfig = JSON.parse(cleaned);
    const paths = tsconfig?.compilerOptions?.paths ?? {};
    const baseUrl = tsconfig?.compilerOptions?.baseUrl ?? ".";

    for (const [alias, targets] of Object.entries(paths)) {
      if (Array.isArray(targets) && targets.length > 0) {
        const cleanAlias = alias.replace("/*", "/");
        const cleanTarget = (targets[0] as string).replace("/*", "/");
        aliases[cleanAlias] = path.join(baseUrl, cleanTarget);
      }
    }
  } catch {
    // No tsconfig or parse error
  }

  return { aliases };
}
```

- [ ] **Step 8: Run resolver tests**

```bash
pnpm vitest run tests/unit/graph/resolver.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 9: Commit**

```bash
git add src/graph/parser.ts src/graph/resolver.ts tests/unit/graph/
git commit -m "feat: dep graph parser and resolver with import/export extraction"
```

---

## Task 7: Dependency Graph — Builder, Cycles, Clusterer

**Files:**
- Create: `src/graph/builder.ts`
- Create: `src/graph/cycles.ts`
- Create: `src/graph/clusterer.ts`
- Create: `src/graph/index.ts`
- Test: `tests/unit/graph/cycles.test.ts`
- Test: `tests/unit/graph/clusterer.test.ts`

- [ ] **Step 1: Write failing test for cycle detection**

Create `tests/unit/graph/cycles.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { detectCycles } from "@/graph/cycles.js";
import type { DepGraph } from "@/types/graph.js";

function makeGraph(edges: Array<[string, string]>): DepGraph {
  const nodes = new Map<string, { path: string; imports: string[]; importedBy: string[] }>();
  for (const [from, to] of edges) {
    if (!nodes.has(from)) nodes.set(from, { path: from, imports: [], importedBy: [] } as any);
    if (!nodes.has(to)) nodes.set(to, { path: to, imports: [], importedBy: [] } as any);
    nodes.get(from)!.imports.push(to);
    nodes.get(to)!.importedBy.push(from);
  }
  return { nodes, edges: [], entryPoints: [], leafNodes: [], cycles: [] } as any;
}

describe("detectCycles", () => {
  it("finds no cycles in acyclic graph", () => {
    const graph = makeGraph([["a", "b"], ["b", "c"]]);
    expect(detectCycles(graph)).toEqual([]);
  });

  it("finds a simple cycle", () => {
    const graph = makeGraph([["a", "b"], ["b", "a"]]);
    const cycles = detectCycles(graph);
    expect(cycles.length).toBeGreaterThan(0);
    expect(cycles[0]).toContain("a");
    expect(cycles[0]).toContain("b");
  });

  it("finds cycle in larger graph", () => {
    const graph = makeGraph([["a", "b"], ["b", "c"], ["c", "a"], ["c", "d"]]);
    const cycles = detectCycles(graph);
    expect(cycles.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run tests/unit/graph/cycles.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create `src/graph/cycles.ts`**

```typescript
import type { DepGraph } from "../types/graph.js";

export function detectCycles(graph: DepGraph): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(node: string, path: string[]): void {
    if (inStack.has(node)) {
      const cycleStart = path.indexOf(node);
      if (cycleStart !== -1) {
        cycles.push(path.slice(cycleStart));
      }
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    inStack.add(node);
    path.push(node);

    const fileNode = graph.nodes.get(node);
    if (fileNode) {
      for (const dep of fileNode.imports) {
        if (graph.nodes.has(dep)) {
          dfs(dep, [...path]);
        }
      }
    }

    inStack.delete(node);
  }

  for (const node of graph.nodes.keys()) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  return cycles;
}
```

- [ ] **Step 4: Run cycle tests**

```bash
pnpm vitest run tests/unit/graph/cycles.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Write failing test for clusterer**

Create `tests/unit/graph/clusterer.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { clusterByDirectory } from "@/graph/clusterer.js";
import type { FileNode } from "@/types/graph.js";

function makeNode(filePath: string): FileNode {
  return {
    path: filePath,
    imports: [],
    importedBy: [],
    exports: [],
    moduleId: "",
    depth: 0,
    size: 100,
    language: "ts",
  };
}

describe("clusterByDirectory", () => {
  it("groups files by parent directory", () => {
    const nodes = [
      makeNode("src/auth/login.ts"),
      makeNode("src/auth/register.ts"),
      makeNode("src/api/users.ts"),
    ];
    const clusters = clusterByDirectory(nodes);
    expect(clusters).toHaveLength(2);
    const authCluster = clusters.find((c) => c.id === "src/auth");
    expect(authCluster?.files).toHaveLength(2);
  });

  it("handles root-level files", () => {
    const nodes = [makeNode("index.ts"), makeNode("config.ts")];
    const clusters = clusterByDirectory(nodes);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].files).toHaveLength(2);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
pnpm vitest run tests/unit/graph/clusterer.test.ts
```

Expected: FAIL.

- [ ] **Step 7: Create `src/graph/clusterer.ts`**

```typescript
import path from "path";
import type { FileNode, Edge, ExportInfo, ModuleCluster } from "../types/graph.js";

export function clusterByDirectory(
  nodes: FileNode[],
  maxDepth = 2,
): ModuleCluster[] {
  const groups = new Map<string, FileNode[]>();

  for (const node of nodes) {
    const parts = node.path.split("/");
    const dirParts = parts.slice(0, Math.min(parts.length - 1, maxDepth));
    const dir = dirParts.length > 0 ? dirParts.join("/") : ".";

    if (!groups.has(dir)) groups.set(dir, []);
    groups.get(dir)!.push(node);
  }

  const clusters: ModuleCluster[] = [];
  let order = 0;

  for (const [dir, files] of groups) {
    // Split large clusters
    if (files.length > 20) {
      const subGroups = new Map<string, FileNode[]>();
      for (const file of files) {
        const parts = file.path.split("/");
        const subDir = parts.slice(0, Math.min(parts.length - 1, maxDepth + 1)).join("/");
        if (!subGroups.has(subDir)) subGroups.set(subDir, []);
        subGroups.get(subDir)!.push(file);
      }
      for (const [subDir, subFiles] of subGroups) {
        clusters.push({
          id: subDir,
          files: subFiles,
          internalEdges: [],
          externalImports: [],
          externalExports: [],
          scanOrder: order++,
        });
      }
    } else {
      clusters.push({
        id: dir,
        files,
        internalEdges: [],
        externalImports: [],
        externalExports: [],
        scanOrder: order++,
      });
    }
  }

  // Merge small clusters (<3 files) with nearest neighbor
  const merged: ModuleCluster[] = [];
  const small: ModuleCluster[] = [];

  for (const cluster of clusters) {
    if (cluster.files.length < 3) {
      small.push(cluster);
    } else {
      merged.push(cluster);
    }
  }

  if (small.length > 0) {
    if (merged.length > 0) {
      // Merge small clusters into the first cluster with closest directory
      for (const s of small) {
        let bestMatch = merged[0];
        let bestScore = 0;
        for (const m of merged) {
          const commonPrefix = getCommonPrefix(s.id, m.id);
          if (commonPrefix.length > bestScore) {
            bestScore = commonPrefix.length;
            bestMatch = m;
          }
        }
        bestMatch.files.push(...s.files);
      }
    } else {
      // Only small clusters — combine them all
      merged.push({
        id: small.map((s) => s.id).join("+"),
        files: small.flatMap((s) => s.files),
        internalEdges: [],
        externalImports: [],
        externalExports: [],
        scanOrder: 0,
      });
    }
  }

  return merged;
}

function getCommonPrefix(a: string, b: string): string {
  const aParts = a.split("/");
  const bParts = b.split("/");
  const common: string[] = [];
  for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
    if (aParts[i] === bParts[i]) common.push(aParts[i]);
    else break;
  }
  return common.join("/");
}
```

- [ ] **Step 8: Create `src/graph/builder.ts`**

```typescript
import fs from "fs/promises";
import path from "path";
import { parseImports, parseExports } from "./parser.js";
import { resolveImport, loadResolverConfig, type ResolverConfig } from "./resolver.js";
import type { DepGraph, FileNode, Edge, SourceLanguage } from "../types/graph.js";

const EXT_MAP: Record<string, SourceLanguage> = {
  ".ts": "ts", ".tsx": "tsx", ".js": "js", ".jsx": "jsx", ".mjs": "mjs", ".cjs": "cjs",
};

export async function buildGraph(
  projectPath: string,
  files: string[],
): Promise<DepGraph> {
  const { aliases } = await loadResolverConfig(projectPath);

  // Build a set of existing files for the resolver
  const fileSet = new Set(files.map((f) => path.resolve(projectPath, f)));

  const resolverConfig: ResolverConfig = {
    aliases,
    extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"],
    projectPath,
    fileExists: (p: string) => fileSet.has(p),
  };

  const nodes = new Map<string, FileNode>();
  const edges: Edge[] = [];

  // Parse all files
  await Promise.all(
    files.map(async (filePath) => {
      const absPath = path.resolve(projectPath, filePath);
      const content = await fs.readFile(absPath, "utf-8");
      const ext = path.extname(filePath);
      const imports = parseImports(content);
      const exports = parseExports(content);
      const stat = await fs.stat(absPath);

      const node: FileNode = {
        path: filePath,
        imports: [],
        importedBy: [],
        exports,
        moduleId: "",
        depth: 0,
        size: stat.size,
        language: EXT_MAP[ext] ?? "ts",
      };

      nodes.set(filePath, node);

      for (const imp of imports) {
        const resolved = resolveImport(imp.specifier, absPath, resolverConfig);
        if (resolved) {
          node.imports.push(resolved);
          edges.push({
            from: filePath,
            to: resolved,
            type: imp.type,
            specifiers: [],
          });
        }
      }
    }),
  );

  // Compute importedBy
  for (const edge of edges) {
    const target = nodes.get(edge.to);
    if (target) {
      target.importedBy.push(edge.from);
    }
  }

  // Find entry points and leaf nodes
  const entryPoints = [...nodes.values()]
    .filter((n) => n.importedBy.length === 0)
    .map((n) => n.path);
  const leafNodes = [...nodes.values()]
    .filter((n) => n.imports.length === 0)
    .map((n) => n.path);

  return { nodes, edges, entryPoints, leafNodes, cycles: [] };
}
```

- [ ] **Step 9: Create `src/graph/index.ts`**

```typescript
import { buildGraph } from "./builder.js";
import { detectCycles } from "./cycles.js";
import { clusterByDirectory } from "./clusterer.js";
import type { DepGraph, ModuleCluster } from "../types/graph.js";

export { parseImports, parseExports } from "./parser.js";
export { resolveImport, loadResolverConfig } from "./resolver.js";
export { buildGraph } from "./builder.js";
export { detectCycles } from "./cycles.js";
export { clusterByDirectory } from "./clusterer.js";

export async function buildDepGraph(
  projectPath: string,
  files: string[],
): Promise<{ graph: DepGraph; clusters: ModuleCluster[] }> {
  const graph = await buildGraph(projectPath, files);
  graph.cycles = detectCycles(graph);
  const clusters = clusterByDirectory([...graph.nodes.values()]);
  return { graph, clusters };
}
```

- [ ] **Step 10: Run all graph tests**

```bash
pnpm vitest run tests/unit/graph/
```

Expected: All tests PASS.

- [ ] **Step 11: Commit**

```bash
git add src/graph/ tests/unit/graph/
git commit -m "feat: dep graph builder, cycle detection, module clustering"
```

---

## Task 8: Claude Bridge

**Files:**
- Create: `src/bridge/spawner.ts`
- Create: `src/bridge/parser.ts`
- Create: `src/bridge/pool.ts`
- Create: `src/bridge/retry.ts`
- Create: `src/bridge/index.ts`
- Test: `tests/unit/bridge/parser.test.ts`
- Test: `tests/unit/bridge/pool.test.ts`

- [ ] **Step 1: Write failing test for response parsing**

Create `tests/unit/bridge/parser.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseClaudeResponse, claudeResponseSchema } from "@/bridge/parser.js";

describe("parseClaudeResponse", () => {
  it("parses valid JSON response with findings", () => {
    const raw = JSON.stringify({
      findings: [
        {
          id: "abc123",
          file: "src/auth.ts",
          line: 42,
          severity: "critical",
          mode: "security",
          title: "SQL injection",
          description: "User input in query",
          evidence: "const q = `SELECT ${id}`",
          suggestion: "Use parameterized queries",
          confidence: "high",
        },
      ],
      moduleSummary: "Auth module has issues",
      healthScore: 45,
    });
    const result = parseClaudeResponse(raw);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].severity).toBe("critical");
    expect(result.healthScore).toBe(45);
  });

  it("returns empty findings for invalid JSON", () => {
    const result = parseClaudeResponse("not json at all");
    expect(result.findings).toEqual([]);
    expect(result.healthScore).toBe(50);
  });

  it("extracts JSON from markdown code blocks", () => {
    const raw = 'Some text\n```json\n{"findings":[],"moduleSummary":"ok","healthScore":90}\n```\nMore text';
    const result = parseClaudeResponse(raw);
    expect(result.findings).toEqual([]);
    expect(result.healthScore).toBe(90);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run tests/unit/bridge/parser.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create `src/bridge/parser.ts`**

```typescript
import { z } from "zod";

const findingSchema = z.object({
  id: z.string().default(""),
  file: z.string(),
  line: z.number(),
  endLine: z.number().optional(),
  column: z.number().optional(),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  mode: z.enum(["security", "performance", "reliability", "maintainability", "tests"]),
  title: z.string(),
  description: z.string(),
  evidence: z.string().default(""),
  suggestion: z.string().default(""),
  fix: z
    .object({
      description: z.string(),
      diff: z.array(
        z.object({
          file: z.string(),
          oldCode: z.string(),
          newCode: z.string(),
          startLine: z.number(),
          endLine: z.number(),
        }),
      ),
      confidence: z.enum(["high", "medium", "low"]),
      breaking: z.boolean(),
      testSuggestion: z.string().optional(),
    })
    .optional(),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
  framework: z.string().optional(),
  rule: z.string().optional(),
  references: z.array(z.string()).optional(),
});

export const claudeResponseSchema = z.object({
  findings: z.array(findingSchema),
  moduleSummary: z.string().default(""),
  healthScore: z.number().min(0).max(100).default(50),
});

export type ClaudeAuditResponse = z.infer<typeof claudeResponseSchema>;

function extractJsonFromMarkdown(text: string): string | null {
  const match = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  return match ? match[1] : null;
}

export function parseClaudeResponse(raw: string): ClaudeAuditResponse {
  // Try direct JSON parse
  try {
    const parsed = JSON.parse(raw);
    return claudeResponseSchema.parse(parsed);
  } catch {
    // Not direct JSON
  }

  // Try extracting from markdown code block
  const extracted = extractJsonFromMarkdown(raw);
  if (extracted) {
    try {
      const parsed = JSON.parse(extracted);
      return claudeResponseSchema.parse(parsed);
    } catch {
      // Invalid JSON in code block
    }
  }

  // Fallback: empty response
  return { findings: [], moduleSummary: "", healthScore: 50 };
}
```

- [ ] **Step 4: Create `src/bridge/retry.ts`**

```typescript
export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isRateLimit =
        lastError.message.includes("rate") || lastError.message.includes("429");

      if (attempt === opts.maxRetries || !isRateLimit) throw lastError;

      const delay = Math.min(
        opts.baseDelayMs * Math.pow(2, attempt),
        opts.maxDelayMs,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

- [ ] **Step 5: Create `src/bridge/spawner.ts`**

```typescript
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface SpawnOptions {
  prompt: string;
  cwd?: string;
  timeoutMs?: number;
}

export interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function spawnClaude(options: SpawnOptions): Promise<SpawnResult> {
  const args = ["-p", options.prompt, "--output-format", "json"];

  try {
    const { stdout, stderr } = await execFileAsync("claude", args, {
      cwd: options.cwd,
      timeout: options.timeoutMs ?? 300_000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? String(err),
      exitCode: e.code ?? 1,
    };
  }
}
```

- [ ] **Step 6: Create `src/bridge/pool.ts`**

```typescript
import pLimit from "p-limit";

export interface AgentTask<T> {
  id: string;
  label: string;
  run: () => Promise<T>;
}

export interface AgentResult<T> {
  id: string;
  label: string;
  result?: T;
  error?: Error;
  durationMs: number;
}

export interface PoolProgress {
  total: number;
  completed: number;
  active: string[];
  failed: string[];
}

export type ProgressCallback = (progress: PoolProgress) => void;

export async function runAgentPool<T>(
  tasks: AgentTask<T>[],
  options?: { onProgress?: ProgressCallback },
): Promise<AgentResult<T>[]> {
  // Orchestrator-driven: 1 agent per task, no artificial cap
  const limit = pLimit(tasks.length || 1);
  const results: AgentResult<T>[] = [];
  const active = new Set<string>();
  const failed = new Set<string>();
  let completed = 0;

  function reportProgress(): void {
    options?.onProgress?.({
      total: tasks.length,
      completed,
      active: [...active],
      failed: [...failed],
    });
  }

  const promises = tasks.map((task) =>
    limit(async () => {
      active.add(task.label);
      reportProgress();
      const start = Date.now();

      try {
        const result = await task.run();
        active.delete(task.label);
        completed++;
        reportProgress();
        const agentResult: AgentResult<T> = {
          id: task.id,
          label: task.label,
          result,
          durationMs: Date.now() - start,
        };
        results.push(agentResult);
        return agentResult;
      } catch (err) {
        active.delete(task.label);
        failed.add(task.label);
        completed++;
        reportProgress();
        const agentResult: AgentResult<T> = {
          id: task.id,
          label: task.label,
          error: err instanceof Error ? err : new Error(String(err)),
          durationMs: Date.now() - start,
        };
        results.push(agentResult);
        return agentResult;
      }
    }),
  );

  await Promise.all(promises);
  return results;
}
```

- [ ] **Step 7: Write failing test for pool**

Create `tests/unit/bridge/pool.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { runAgentPool, type AgentTask } from "@/bridge/pool.js";

describe("runAgentPool", () => {
  it("runs all tasks and returns results", async () => {
    const tasks: AgentTask<number>[] = [
      { id: "1", label: "task-a", run: async () => 10 },
      { id: "2", label: "task-b", run: async () => 20 },
      { id: "3", label: "task-c", run: async () => 30 },
    ];
    const results = await runAgentPool(tasks);
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.result).sort()).toEqual([10, 20, 30]);
  });

  it("captures errors without crashing other tasks", async () => {
    const tasks: AgentTask<number>[] = [
      { id: "1", label: "ok", run: async () => 42 },
      { id: "2", label: "fail", run: async () => { throw new Error("boom"); } },
    ];
    const results = await runAgentPool(tasks);
    expect(results).toHaveLength(2);
    const ok = results.find((r) => r.id === "1")!;
    const fail = results.find((r) => r.id === "2")!;
    expect(ok.result).toBe(42);
    expect(fail.error?.message).toBe("boom");
  });

  it("reports progress", async () => {
    const progressUpdates: number[] = [];
    const tasks: AgentTask<number>[] = [
      { id: "1", label: "a", run: async () => 1 },
      { id: "2", label: "b", run: async () => 2 },
    ];
    await runAgentPool(tasks, {
      onProgress: (p) => progressUpdates.push(p.completed),
    });
    expect(progressUpdates.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 8: Create `src/bridge/index.ts`**

```typescript
export { spawnClaude, type SpawnOptions, type SpawnResult } from "./spawner.js";
export { parseClaudeResponse, claudeResponseSchema, type ClaudeAuditResponse } from "./parser.js";
export { runAgentPool, type AgentTask, type AgentResult, type PoolProgress, type ProgressCallback } from "./pool.js";
export { withRetry, type RetryOptions } from "./retry.js";
```

- [ ] **Step 9: Run all bridge tests**

```bash
pnpm vitest run tests/unit/bridge/
```

Expected: All tests PASS.

- [ ] **Step 10: Commit**

```bash
git add src/bridge/ tests/unit/bridge/
git commit -m "feat: Claude bridge (spawner, response parser, agent pool, retry)"
```

---

## Task 9: Framework Profiles

**Files:**
- Create: `src/profiles/types.ts`
- Create: `src/profiles/base.ts`
- Create: `src/profiles/node.ts`
- Create: `src/profiles/typescript.ts`
- Create: `src/profiles/react.ts`
- Create: `src/profiles/nextjs.ts`
- Create: `src/profiles/express.ts`
- Create: `src/profiles/fastify.ts`
- Create: `src/profiles/nestjs.ts`
- Create: `src/profiles/testing.ts`
- Create: `src/profiles/index.ts`
- Test: `tests/unit/profiles/detector.test.ts`

- [ ] **Step 1: Write failing test for profile detection**

Create `tests/unit/profiles/detector.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { detectProfiles } from "@/profiles/index.js";
import type { ProjectInfo } from "@/types/scan.js";

function makeProject(overrides: Partial<ProjectInfo> = {}): ProjectInfo {
  return {
    name: "test",
    languages: ["typescript"],
    frameworks: [],
    packageManager: "pnpm",
    totalFiles: 10,
    scannedFiles: 10,
    ...overrides,
  };
}

describe("detectProfiles", () => {
  it("always includes base profile", () => {
    const profiles = detectProfiles(makeProject());
    expect(profiles.some((p) => p.id === "base")).toBe(true);
  });

  it("detects Next.js profile from frameworks", () => {
    const profiles = detectProfiles(makeProject({ frameworks: ["next", "react"] }));
    expect(profiles.some((p) => p.id === "nextjs")).toBe(true);
    expect(profiles.some((p) => p.id === "react")).toBe(true);
  });

  it("detects Express profile", () => {
    const profiles = detectProfiles(makeProject({ frameworks: ["express"] }));
    expect(profiles.some((p) => p.id === "express")).toBe(true);
    expect(profiles.some((p) => p.id === "react")).toBe(false);
  });

  it("includes typescript profile when language detected", () => {
    const profiles = detectProfiles(makeProject({ languages: ["typescript"] }));
    expect(profiles.some((p) => p.id === "typescript")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run tests/unit/profiles/detector.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create `src/profiles/types.ts`**

```typescript
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
```

- [ ] **Step 4: Create `src/profiles/base.ts`**

```typescript
import type { FrameworkProfile } from "./types.js";

export const baseProfile: FrameworkProfile = {
  id: "base",
  name: "Universal",
  detect: () => true,
  filePatterns: ["**/*"],
  knownPitfalls: [],
  promptFragments: {
    security: `## Universal Security Rules
1. Command injection: child_process.exec with unsanitized user input
2. Path traversal: fs operations with unsanitized paths
3. Prototype pollution: Object.assign/spread from user input
4. Regex DoS: Complex regex on user-controlled strings
5. Hardcoded secrets: API keys, tokens, passwords in source code
6. Insecure randomness: Math.random() for security-sensitive operations
7. Eval usage: eval(), Function(), vm.runInNewContext with user data
8. Missing input validation at system boundaries`,
    performance: `## Universal Performance Rules
1. N+1 queries: Database calls inside loops
2. Missing pagination: Unbounded array/query results
3. Sync file I/O: fs.readFileSync in request handlers
4. Memory leaks: Event listeners without cleanup, unbounded caches
5. Unnecessary re-computation: Expensive ops without memoization
6. Large payloads: Unbounded response sizes`,
    reliability: `## Universal Reliability Rules
1. Unhandled promise rejections
2. Missing error handling in async operations
3. Race conditions in concurrent code
4. Null/undefined access without guards
5. Resource cleanup: missing finally blocks, unclosed connections`,
    maintainability: `## Universal Maintainability Rules
1. Functions over 50 lines
2. Deeply nested conditionals (>3 levels)
3. Duplicate code blocks
4. Magic numbers/strings without constants
5. Unclear variable/function naming`,
    tests: `## Universal Testing Rules
1. Missing tests for critical business logic
2. Tests that don't assert anything meaningful
3. Flaky test patterns (timing, network, shared state)
4. Missing edge case coverage (empty, null, boundary values)
5. Test files that don't match source file structure`,
  },
};
```

- [ ] **Step 5: Create remaining profile files**

Create `src/profiles/node.ts`, `src/profiles/typescript.ts`, `src/profiles/react.ts`, `src/profiles/nextjs.ts`, `src/profiles/express.ts`, `src/profiles/fastify.ts`, `src/profiles/nestjs.ts`, `src/profiles/testing.ts`.

Each follows the same pattern. Here is `src/profiles/nextjs.ts` as the most detailed example:

```typescript
import type { FrameworkProfile } from "./types.js";

export const nextjsProfile: FrameworkProfile = {
  id: "nextjs",
  name: "Next.js",
  detect: (project) => project.frameworks.includes("next"),
  filePatterns: ["app/**/page.{ts,tsx}", "app/**/layout.{ts,tsx}", "app/**/route.{ts,tsx}", "app/api/**/*", "middleware.{ts,js}"],
  knownPitfalls: [
    {
      id: "nextjs/unsafe-server-action",
      title: "Unvalidated Server Action inputs",
      severity: "critical",
      description: "Server Actions are public HTTP endpoints. Arguments must be validated with zod or similar.",
      codePattern: '"use server"',
      references: ["CWE-20: Improper Input Validation"],
    },
    {
      id: "nextjs/ssr-data-leak",
      title: "Sensitive data passed from server to client component",
      severity: "critical",
      description: "Server component passes DB records or secrets as props to a 'use client' component.",
      references: ["CWE-200: Exposure of Sensitive Information"],
    },
    {
      id: "nextjs/missing-middleware-matcher",
      title: "Middleware matcher doesn't cover all protected routes",
      severity: "high",
      description: "New route segments added without updating middleware.ts matcher.",
      references: ["CWE-862: Missing Authorization"],
    },
  ],
  promptFragments: {
    security: `## Next.js Security Audit Rules
1. Server Actions: Check ALL "use server" functions validate inputs. They are public HTTP endpoints.
2. API Routes (app/api/): Check for missing auth, unvalidated bodies, injection via query params.
3. Middleware bypass: Ensure middleware.ts matcher covers all protected routes.
4. SSR data exposure: Check server components don't pass secrets/DB records to client components.
5. Dynamic rendering secrets: Ensure secrets aren't in dynamically rendered pages (client bundles).
6. Image/redirect open redirect: Check next.config.js images.domains and redirects.`,
    performance: `## Next.js Performance Audit Rules
1. Bundle size: Large client-side imports that should use next/dynamic.
2. Missing Suspense: Pages with async data should use Suspense for streaming.
3. Image optimization: <img> tags that should be <Image> from next/image.
4. Client component bloat: "use client" components that could be split.`,
    reliability: `## Next.js Reliability Audit Rules
1. Missing error.tsx in route segments.
2. Missing loading.tsx in segments with async data.
3. Missing not-found.tsx for dynamic routes.
4. Middleware error handling: unhandled exceptions in middleware.ts.
5. API route error responses: proper status codes and structured errors.`,
  },
};
```

The remaining profiles (`node.ts`, `typescript.ts`, `react.ts`, `express.ts`, `fastify.ts`, `nestjs.ts`, `testing.ts`) each follow this exact structure with their own `id`, `detect` function checking `project.frameworks` or `project.languages`, and relevant `promptFragments` and `knownPitfalls`. Each file is ~50-80 lines.

- [ ] **Step 6: Create `src/profiles/index.ts`**

```typescript
import type { FrameworkProfile, AuditMode } from "./types.js";
import type { ProjectInfo } from "../types/scan.js";
import { baseProfile } from "./base.js";
import { nodeProfile } from "./node.js";
import { typescriptProfile } from "./typescript.js";
import { reactProfile } from "./react.js";
import { nextjsProfile } from "./nextjs.js";
import { expressProfile } from "./express.js";
import { fastifyProfile } from "./fastify.js";
import { nestjsProfile } from "./nestjs.js";
import { testingProfile } from "./testing.js";

export type { FrameworkProfile, AuditMode, Pitfall } from "./types.js";

const ALL_PROFILES: FrameworkProfile[] = [
  nodeProfile,
  typescriptProfile,
  reactProfile,
  nextjsProfile,
  expressProfile,
  fastifyProfile,
  nestjsProfile,
  testingProfile,
];

export function detectProfiles(project: ProjectInfo): FrameworkProfile[] {
  const detected: FrameworkProfile[] = [baseProfile];
  for (const profile of ALL_PROFILES) {
    if (profile.detect(project)) {
      detected.push(profile);
    }
  }
  return detected;
}

export function getProfileFragments(
  profiles: FrameworkProfile[],
  mode: AuditMode,
): string {
  return profiles
    .map((p) => p.promptFragments[mode] ?? "")
    .filter((s) => s.length > 0)
    .join("\n\n");
}

export function getAllPitfalls(profiles: FrameworkProfile[]): string {
  return profiles
    .flatMap((p) => p.knownPitfalls)
    .map((p) => `- [${p.id}] ${p.title}: ${p.description}`)
    .join("\n");
}
```

- [ ] **Step 7: Run profile tests**

```bash
pnpm vitest run tests/unit/profiles/detector.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/profiles/ tests/unit/profiles/
git commit -m "feat: framework profiles (base, node, ts, react, nextjs, express, fastify, nestjs, testing)"
```

---

## Task 10: Analyzer (Scan Orchestrator)

**Files:**
- Create: `src/analyzer/prompt.ts`
- Create: `src/analyzer/chunk-audit.ts`
- Create: `src/analyzer/cross-module.ts`
- Create: `src/analyzer/dedup.ts`
- Create: `src/analyzer/index.ts`

- [ ] **Step 1: Create `src/analyzer/prompt.ts`**

```typescript
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
```

- [ ] **Step 2: Create `src/analyzer/chunk-audit.ts`**

```typescript
import fs from "fs/promises";
import path from "path";
import type { ModuleCluster } from "../types/graph.js";
import type { FrameworkProfile, AuditMode } from "../profiles/types.js";
import { buildChunkPrompt } from "./prompt.js";
import { spawnClaude } from "../bridge/spawner.js";
import { parseClaudeResponse, type ClaudeAuditResponse } from "../bridge/parser.js";
import { withRetry } from "../bridge/retry.js";

export async function auditChunk(
  projectPath: string,
  chunk: ModuleCluster,
  profiles: FrameworkProfile[],
  mode: AuditMode,
  depth: "shallow" | "standard" | "deep",
): Promise<ClaudeAuditResponse> {
  // Read file contents
  const fileContents = new Map<string, string>();
  for (const file of chunk.files) {
    const content = await fs.readFile(path.resolve(projectPath, file.path), "utf-8");
    fileContents.set(file.path, content);
  }

  const prompt = buildChunkPrompt(chunk, profiles, mode, depth, fileContents);

  const result = await withRetry(async () => {
    const { stdout } = await spawnClaude({ prompt, cwd: projectPath });
    return parseClaudeResponse(stdout);
  });

  return result;
}
```

- [ ] **Step 3: Create `src/analyzer/cross-module.ts`**

```typescript
import type { ModuleScan } from "../types/scan.js";
import type { Finding } from "../types/finding.js";
import { buildCrossModulePrompt } from "./prompt.js";
import { spawnClaude } from "../bridge/spawner.js";
import { parseClaudeResponse, type ClaudeAuditResponse } from "../bridge/parser.js";
import { withRetry } from "../bridge/retry.js";

export async function crossModulePass(
  projectPath: string,
  modules: ModuleScan[],
  existingFindings: Finding[],
  projectName: string,
): Promise<ClaudeAuditResponse> {
  const prompt = buildCrossModulePrompt(modules, existingFindings, projectName);

  return withRetry(async () => {
    const { stdout } = await spawnClaude({ prompt, cwd: projectPath });
    return parseClaudeResponse(stdout);
  });
}
```

- [ ] **Step 4: Create `src/analyzer/dedup.ts`**

```typescript
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
```

- [ ] **Step 5: Create `src/analyzer/index.ts`**

```typescript
import fs from "fs/promises";
import path from "path";
import { discover, walkFiles, detectProject } from "../discovery/index.js";
import { buildDepGraph } from "../graph/index.js";
import { detectProfiles } from "../profiles/index.js";
import { auditChunk } from "./chunk-audit.js";
import { crossModulePass } from "./cross-module.js";
import { deduplicateFindings, generateFindingId } from "./dedup.js";
import { runAgentPool, type AgentTask, type ProgressCallback } from "../bridge/pool.js";
import type { ScanResult, ScanMeta, ScanSummary, ModuleScan, ProjectInfo, ScanDepth } from "../types/scan.js";
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
  const { graph, clusters } = await buildDepGraph(projectPath, files);

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
```

- [ ] **Step 6: Verify types compile**

```bash
pnpm run typecheck
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/analyzer/
git commit -m "feat: analyzer (scan orchestrator, prompt builder, chunk audit, cross-module, dedup)"
```

---

## Task 11: Fixer Engine

**Files:**
- Create: `src/fixer/planner.ts`
- Create: `src/fixer/guard.ts`
- Create: `src/fixer/applier.ts`
- Create: `src/fixer/validator.ts`
- Create: `src/fixer/committer.ts`
- Create: `src/fixer/index.ts`
- Test: `tests/unit/fixer/planner.test.ts`
- Test: `tests/unit/fixer/applier.test.ts`

- [ ] **Step 1: Write failing test for fix planner**

Create `tests/unit/fixer/planner.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { planFixes } from "@/fixer/planner.js";
import type { ScanResult } from "@/types/scan.js";
import type { Finding } from "@/types/finding.js";

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: "f1",
    file: "src/a.ts",
    line: 1,
    severity: "high",
    mode: "security",
    title: "test",
    description: "test",
    evidence: "",
    suggestion: "",
    confidence: "high",
    fix: {
      description: "fix it",
      diff: [{ file: "src/a.ts", oldCode: "old", newCode: "new", startLine: 1, endLine: 1 }],
      confidence: "high",
      breaking: false,
    },
    ...overrides,
  };
}

function makeScanResult(findings: Finding[]): ScanResult {
  return {
    meta: { mode: "full", scope: "full", changedFiles: undefined } as any,
    summary: {} as any,
    findings,
    modules: [],
    crossModuleFindings: [],
  };
}

describe("planFixes", () => {
  it("includes findings with fixes", () => {
    const plan = planFixes(makeScanResult([makeFinding()]), { scope: "full", autoApprove: false, confidenceThreshold: "high", dryRun: false });
    expect(plan.fixes).toHaveLength(1);
  });

  it("skips findings without fixes", () => {
    const plan = planFixes(makeScanResult([makeFinding({ fix: undefined })]), { scope: "full", autoApprove: false, confidenceThreshold: "high", dryRun: false });
    expect(plan.fixes).toHaveLength(0);
    expect(plan.skipped).toHaveLength(1);
  });

  it("marks high-confidence as auto when --yes", () => {
    const plan = planFixes(makeScanResult([makeFinding()]), { scope: "full", autoApprove: true, confidenceThreshold: "high", dryRun: false });
    expect(plan.fixes[0].approval).toBe("auto");
  });

  it("marks medium-confidence as prompt even with --yes", () => {
    const finding = makeFinding({ fix: { ...makeFinding().fix!, confidence: "medium" } });
    const plan = planFixes(makeScanResult([finding]), { scope: "full", autoApprove: true, confidenceThreshold: "high", dryRun: false });
    expect(plan.fixes[0].approval).toBe("prompt");
  });

  it("orders by severity (critical first)", () => {
    const findings = [
      makeFinding({ id: "low", severity: "low" }),
      makeFinding({ id: "crit", severity: "critical" }),
    ];
    const plan = planFixes(makeScanResult(findings), { scope: "full", autoApprove: false, confidenceThreshold: "high", dryRun: false });
    expect(plan.order[0]).toBe("crit");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run tests/unit/fixer/planner.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create `src/fixer/planner.ts`**

```typescript
import type { Finding, Confidence } from "../types/finding.js";
import type { ScanResult } from "../types/scan.js";
import type { FixPlan, PlannedFix, SkippedFix, FixOptions } from "../types/fix.js";

const SEVERITY_PRIORITY: Record<string, number> = {
  critical: 0, high: 1, medium: 2, low: 3, info: 4,
};

const CONFIDENCE_RANK: Record<string, number> = {
  high: 3, medium: 2, low: 1,
};

function shouldAutoApprove(finding: Finding, options: FixOptions): boolean {
  if (!options.autoApprove || !finding.fix) return false;
  return CONFIDENCE_RANK[finding.fix.confidence] >= CONFIDENCE_RANK[options.confidenceThreshold];
}

export function planFixes(scanResult: ScanResult, options: FixOptions): FixPlan {
  let allFindings = [...scanResult.findings, ...scanResult.crossModuleFindings];

  // Filter by scope
  if (options.scope === "branch" && scanResult.meta.changedFiles) {
    const changed = new Set(scanResult.meta.changedFiles);
    allFindings = allFindings.filter((f) => changed.has(f.file));
  }

  // Filter by TUI selection
  if (options.selectedIds) {
    const selected = new Set(options.selectedIds);
    allFindings = allFindings.filter((f) => selected.has(f.id));
  }

  // Filter by scan mode
  if (scanResult.meta.mode !== "full") {
    allFindings = allFindings.filter((f) => f.mode === scanResult.meta.mode);
  }

  const fixes: PlannedFix[] = [];
  const skipped: SkippedFix[] = [];

  for (const finding of allFindings) {
    if (!finding.fix) {
      skipped.push({ findingId: finding.id, reason: "no-fix-available" });
      continue;
    }

    fixes.push({
      findingId: finding.id,
      finding,
      priority: SEVERITY_PRIORITY[finding.severity] ?? 4,
      approval: shouldAutoApprove(finding, options) ? "auto" : "prompt",
    });
  }

  // Sort: critical first, then by file for batching
  fixes.sort((a, b) => a.priority - b.priority || a.finding.file.localeCompare(b.finding.file));

  return {
    scanId: scanResult.meta.timestamp,
    scope: options.scope,
    mode: scanResult.meta.mode,
    fixes,
    skipped,
    order: fixes.map((f) => f.findingId),
  };
}
```

- [ ] **Step 4: Create `src/fixer/guard.ts`**

```typescript
import { getCurrentBranch, createFixBranch, switchBranch, deleteBranch } from "../git/branch.js";
import { autoStash, restoreStash } from "../git/stash.js";
import type { BranchGuard } from "../types/fix.js";

export class BranchGuardImpl implements BranchGuard {
  originalBranch = "";
  fixBranch = "";
  createdAt = "";
  stashId: string | null = null;

  constructor(private projectPath: string, private branchPrefix: string) {}

  async create(): Promise<void> {
    this.stashId = await autoStash(this.projectPath);
    this.originalBranch = (await getCurrentBranch(this.projectPath)) ?? "main";
    this.fixBranch = await createFixBranch(this.projectPath, this.branchPrefix);
    this.createdAt = new Date().toISOString();
  }

  async rollback(): Promise<void> {
    await switchBranch(this.projectPath, this.originalBranch);
    await deleteBranch(this.projectPath, this.fixBranch);
    if (this.stashId) {
      await restoreStash(this.projectPath);
    }
  }

  async complete(): Promise<void> {
    if (this.stashId) {
      await switchBranch(this.projectPath, this.originalBranch);
      await restoreStash(this.projectPath);
      await switchBranch(this.projectPath, this.fixBranch);
    }
  }
}
```

- [ ] **Step 5: Create `src/fixer/applier.ts`**

```typescript
import fs from "fs/promises";
import path from "path";
import type { FixPlan, PlannedFix, FixResult } from "../types/fix.js";
import type { FileDiff } from "../types/finding.js";

async function snapshotFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf-8");
}

async function restoreFile(filePath: string, content: string): Promise<void> {
  await fs.writeFile(filePath, content, "utf-8");
}

async function applyDiff(projectPath: string, diff: FileDiff): Promise<void> {
  const filePath = path.resolve(projectPath, diff.file);
  const content = await fs.readFile(filePath, "utf-8");

  if (!content.includes(diff.oldCode)) {
    throw new Error(`Expected code not found in ${diff.file}:${diff.startLine}. File may have been modified since scan.`);
  }

  const updated = content.replace(diff.oldCode, diff.newCode);
  await fs.writeFile(filePath, updated, "utf-8");
}

export async function applyFixes(
  projectPath: string,
  plan: FixPlan,
  promptUser: (message: string) => Promise<string>,
): Promise<FixResult[]> {
  const results: FixResult[] = [];

  for (const fixId of plan.order) {
    const planned = plan.fixes.find((f) => f.findingId === fixId);
    if (!planned || !planned.finding.fix) continue;

    // Prompt user if needed
    if (planned.approval === "prompt") {
      const answer = await promptUser(
        `Apply ${planned.finding.fix.confidence}-confidence fix for "${planned.finding.title}" in ${planned.finding.file}? [y/n/s(skip all)]`,
      );
      if (answer === "n" || answer === "s") {
        results.push({ findingId: fixId, status: "rejected", filesModified: [], userApproved: false });
        if (answer === "s") break;
        continue;
      }
    }

    // Snapshot files for rollback
    const snapshots = new Map<string, string>();
    for (const diff of planned.finding.fix.diff) {
      const absPath = path.resolve(projectPath, diff.file);
      snapshots.set(absPath, await snapshotFile(absPath));
    }

    try {
      for (const diff of planned.finding.fix.diff) {
        await applyDiff(projectPath, diff);
      }
      results.push({
        findingId: fixId,
        status: "applied",
        filesModified: planned.finding.fix.diff.map((d) => d.file),
        userApproved: planned.approval === "prompt",
      });
    } catch (err) {
      // Rollback
      for (const [absPath, content] of snapshots) {
        await restoreFile(absPath, content);
      }
      results.push({
        findingId: fixId,
        status: "failed",
        filesModified: [],
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}
```

- [ ] **Step 6: Create `src/fixer/validator.ts`**

```typescript
import { execFile } from "child_process";
import { promisify } from "util";
import type { ValidationReport } from "../types/fix.js";

const exec = promisify(execFile);

async function tryExec(cmd: string, args: string[], cwd: string): Promise<{ ok: boolean; output: string }> {
  try {
    const { stdout, stderr } = await exec(cmd, args, { cwd, timeout: 120_000 });
    return { ok: true, output: stdout + stderr };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string };
    return { ok: false, output: (e.stdout ?? "") + (e.stderr ?? "") };
  }
}

export async function validate(
  projectPath: string,
  modifiedFiles: string[],
  hasTypeScript: boolean,
): Promise<ValidationReport> {
  const report: ValidationReport = {
    syntaxCheck: { passed: true, errors: [] },
    typeCheck: { passed: true, errors: [] },
    lintCheck: { passed: true, errors: [] },
    testRun: { passed: true, failures: [] },
    overall: "pass",
  };

  if (modifiedFiles.length === 0) return report;

  // Type check
  if (hasTypeScript) {
    const tsc = await tryExec("npx", ["tsc", "--noEmit"], projectPath);
    if (!tsc.ok) {
      report.typeCheck.passed = false;
      report.typeCheck.errors = tsc.output.split("\n").filter((l) => l.includes("error"));
    }
  }

  // Lint
  const lint = await tryExec("npx", ["eslint", ...modifiedFiles], projectPath);
  if (!lint.ok) {
    report.lintCheck.passed = false;
    report.lintCheck.errors = lint.output.split("\n").filter((l) => l.trim().length > 0);
  }

  // Tests
  const test = await tryExec("npm", ["test", "--", "--passWithNoTests"], projectPath);
  if (!test.ok) {
    report.testRun.passed = false;
    report.testRun.failures = test.output.split("\n").filter((l) => l.includes("FAIL"));
  }

  // Overall
  if (!report.typeCheck.passed) report.overall = "fail";
  else if (!report.lintCheck.passed || !report.testRun.passed) report.overall = "partial";

  return report;
}
```

- [ ] **Step 7: Create `src/fixer/committer.ts`**

```typescript
import simpleGit from "simple-git";
import type { FixResult, FixPlan, CommitInfo } from "../types/fix.js";

export async function commitFixes(
  projectPath: string,
  results: FixResult[],
  plan: FixPlan,
): Promise<CommitInfo> {
  const applied = results.filter((r) => r.status === "applied");
  if (applied.length === 0) {
    return { committed: false, message: "No fixes applied" };
  }

  const git = simpleGit(projectPath);

  // Group by mode
  const byMode = new Map<string, FixResult[]>();
  for (const result of applied) {
    const finding = plan.fixes.find((f) => f.findingId === result.findingId);
    if (!finding) continue;
    const mode = finding.finding.mode;
    if (!byMode.has(mode)) byMode.set(mode, []);
    byMode.get(mode)!.push(result);
  }

  let commitCount = 0;
  for (const [mode, fixes] of byMode) {
    const files = fixes.flatMap((f) => f.filesModified);
    await git.add(files);
    const titles = fixes
      .map((f) => {
        const planned = plan.fixes.find((p) => p.findingId === f.findingId);
        return `  - ${planned?.finding.title ?? f.findingId}`;
      })
      .join("\n");
    await git.commit(`surgeon: fix ${fixes.length} ${mode} issue(s)\n\n${titles}`);
    commitCount++;
  }

  return {
    committed: true,
    commitCount,
    fixCount: applied.length,
  };
}
```

- [ ] **Step 8: Create `src/fixer/index.ts`**

```typescript
export { planFixes } from "./planner.js";
export { BranchGuardImpl } from "./guard.js";
export { applyFixes } from "./applier.js";
export { validate } from "./validator.js";
export { commitFixes } from "./committer.js";
```

- [ ] **Step 9: Run fixer tests**

```bash
pnpm vitest run tests/unit/fixer/
```

Expected: All tests PASS.

- [ ] **Step 10: Commit**

```bash
git add src/fixer/ tests/unit/fixer/
git commit -m "feat: fixer engine (planner, branch guard, applier, validator, committer)"
```

---

## Task 12: Reporter (JSON + Markdown + HTML)

**Files:**
- Create: `src/reporter/json.ts`
- Create: `src/reporter/markdown.ts`
- Create: `src/reporter/html/styles.ts`
- Create: `src/reporter/html/scripts.ts`
- Create: `src/reporter/html/charts.ts`
- Create: `src/reporter/html/template.ts`
- Create: `src/reporter/html/generator.ts`
- Create: `src/reporter/history.ts`
- Create: `src/reporter/index.ts`
- Test: `tests/unit/reporter/json.test.ts`
- Test: `tests/unit/reporter/markdown.test.ts`

- [ ] **Step 1: Write failing tests for JSON and Markdown reporters**

Create `tests/unit/reporter/json.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { generateJsonString } from "@/reporter/json.js";

describe("generateJsonString", () => {
  it("produces valid JSON from scan result", () => {
    const scanResult = {
      meta: { version: "0.1.0", timestamp: "2026-05-09" } as any,
      summary: { totalFindings: 0, healthScore: 100 } as any,
      findings: [],
      modules: [],
      crossModuleFindings: [],
    };
    const json = generateJsonString(scanResult);
    expect(() => JSON.parse(json)).not.toThrow();
    expect(JSON.parse(json).meta.version).toBe("0.1.0");
  });
});
```

Create `tests/unit/reporter/markdown.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { generateMarkdownString } from "@/reporter/markdown.js";

describe("generateMarkdownString", () => {
  it("includes health score in output", () => {
    const scanResult = {
      meta: { version: "0.1.0", timestamp: "2026-05-09", project: { name: "test" }, scope: "full", mode: "full", duration: 1000 } as any,
      summary: { totalFindings: 1, bySeverity: { high: 1 }, byMode: { security: 1 }, fixable: 1, autoFixable: 0, healthScore: 85 },
      findings: [{ id: "f1", file: "a.ts", line: 1, severity: "high", mode: "security", title: "Test Issue", description: "desc", evidence: "code", suggestion: "fix it", confidence: "high" }],
      modules: [],
      crossModuleFindings: [],
    };
    const md = generateMarkdownString(scanResult as any);
    expect(md).toContain("85/100");
    expect(md).toContain("Test Issue");
    expect(md).toContain("a.ts");
  });

  it("shows branch scope indicator", () => {
    const scanResult = {
      meta: { scope: "branch", base: "main", project: { name: "test" }, changedFiles: ["a.ts"], mode: "full", duration: 500 } as any,
      summary: { totalFindings: 0, bySeverity: {}, byMode: {}, fixable: 0, autoFixable: 0, healthScore: 100 },
      findings: [],
      modules: [],
      crossModuleFindings: [],
    };
    const md = generateMarkdownString(scanResult as any);
    expect(md).toContain("Branch");
    expect(md).toContain("main");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run tests/unit/reporter/
```

Expected: FAIL.

- [ ] **Step 3: Create `src/reporter/json.ts`**

```typescript
import fs from "fs/promises";
import path from "path";
import type { ScanResult } from "../types/scan.js";

export function generateJsonString(scanResult: ScanResult): string {
  return JSON.stringify(scanResult, null, 2);
}

export async function generateJson(scanResult: ScanResult, outputDir: string): Promise<void> {
  await fs.writeFile(path.join(outputDir, "audit.json"), generateJsonString(scanResult), "utf-8");
}
```

- [ ] **Step 4: Create `src/reporter/markdown.ts`**

```typescript
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
      let section = `### [${f.id}] ${f.title}\n- **File:** \`${f.file}:${f.line}\`\n- **Severity:** ${f.severity}\n- **Mode:** ${f.mode}\n- **Confidence:** ${f.confidence}\n- **Fix available:** ${f.fix ? "Yes" : "No"}\n\n> **Evidence:**\n> \`\`\`\n> ${f.evidence}\n> \`\`\`\n\n> **Suggestion:** ${f.suggestion}`;
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
```

- [ ] **Step 5: Create HTML report files**

Create `src/reporter/html/styles.ts`, `src/reporter/html/scripts.ts`, `src/reporter/html/charts.ts`, `src/reporter/html/template.ts`, and `src/reporter/html/generator.ts`.

The HTML generator follows the spec: single self-contained file, inline CSS/JS, sortable table, severity bars, search, filter, click-to-expand diffs. Each file is 80-150 lines of template strings.

`src/reporter/html/generator.ts`:

```typescript
import fs from "fs/promises";
import path from "path";
import type { ScanResult } from "../../types/scan.js";
import { getStyles } from "./styles.js";
import { getScripts } from "./scripts.js";
import { buildSeverityBars, buildModuleHeatmap } from "./charts.js";

export async function generateHtml(scanResult: ScanResult, outputDir: string): Promise<void> {
  const { meta, summary, findings, crossModuleFindings, modules } = scanResult;
  const allFindings = [...findings, ...crossModuleFindings];

  const findingsRows = allFindings
    .map((f) => `<tr data-severity="${f.severity}" data-mode="${f.mode}" data-fixable="${f.fix ? 'yes' : 'no'}">
      <td class="sev-${f.severity}">${f.severity}</td>
      <td><code>${f.file}:${f.line}</code></td>
      <td>${f.title}</td>
      <td>${f.mode}</td>
      <td>${f.confidence}</td>
      <td>${f.fix ? "Yes" : "No"}</td>
    </tr>
    <tr class="detail-row hidden"><td colspan="6"><pre>${f.evidence}</pre><p>${f.description}</p>${f.fix ? `<pre class="diff">- ${f.fix.diff.map((d) => d.oldCode).join("\n- ")}\n+ ${f.fix.diff.map((d) => d.newCode).join("\n+ ")}</pre>` : ""}</td></tr>`)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Surgeon Audit — ${meta.project.name}</title>
<style>${getStyles()}</style>
</head>
<body>
<header>
<h1>Surgeon Audit Report</h1>
<div class="meta">
<span class="badge ${meta.scope}">${meta.scope === "branch" ? "Branch Scan" : "Full Scan"}</span>
<span>Health: <strong>${summary.healthScore}/100</strong></span>
<span>${meta.timestamp}</span>
</div>
</header>
<section id="summary">
${buildSeverityBars(summary.bySeverity)}
<p>Total: ${summary.totalFindings} | Fixable: ${summary.fixable} | Auto-fixable: ${summary.autoFixable}</p>
</section>
<section id="findings">
<div class="toolbar">
<input type="text" id="search" placeholder="Search findings..." />
<select id="sev-filter"><option value="">All Severities</option><option>critical</option><option>high</option><option>medium</option><option>low</option></select>
<select id="mode-filter"><option value="">All Modes</option><option>security</option><option>performance</option><option>reliability</option><option>maintainability</option><option>tests</option></select>
</div>
<table id="findings-table">
<thead><tr><th>Severity</th><th>File</th><th>Issue</th><th>Mode</th><th>Confidence</th><th>Fix</th></tr></thead>
<tbody>${findingsRows}</tbody>
</table>
</section>
<section id="modules">
<h2>Module Health</h2>
${buildModuleHeatmap(modules)}
</section>
<footer><p>Generated by surgeon-ai v${meta.version}</p></footer>
<script>${getScripts()}</script>
</body>
</html>`;

  await fs.writeFile(path.join(outputDir, "audit.html"), html, "utf-8");
}
```

- [ ] **Step 6: Create `src/reporter/history.ts`**

```typescript
import fs from "fs/promises";
import path from "path";
import type { ScanResult } from "../types/scan.js";

export async function saveToHistory(scanResult: ScanResult, outputDir: string): Promise<void> {
  const historyDir = path.join(outputDir, "history");
  await fs.mkdir(historyDir, { recursive: true });
  const filename = scanResult.meta.timestamp.replace(/:/g, "-") + ".json";
  await fs.writeFile(path.join(historyDir, filename), JSON.stringify(scanResult, null, 2), "utf-8");
}
```

- [ ] **Step 7: Create `src/reporter/index.ts`**

```typescript
import fs from "fs/promises";
import { generateJson } from "./json.js";
import { generateMarkdown } from "./markdown.js";
import { generateHtml } from "./html/generator.js";
import { saveToHistory } from "./history.js";
import type { ScanResult } from "../types/scan.js";

export { generateJsonString } from "./json.js";
export { generateMarkdownString } from "./markdown.js";

export async function generateReports(
  scanResult: ScanResult,
  options: { output: string; format: "json" | "md" | "html" | "all" },
): Promise<void> {
  await fs.mkdir(options.output, { recursive: true });

  const generators: Record<string, () => Promise<void>> = {
    json: () => generateJson(scanResult, options.output),
    md: () => generateMarkdown(scanResult, options.output),
    html: () => generateHtml(scanResult, options.output),
  };

  if (options.format === "all") {
    await Promise.all(Object.values(generators).map((fn) => fn()));
  } else {
    await generators[options.format]();
  }

  await saveToHistory(scanResult, options.output);
}
```

- [ ] **Step 8: Run reporter tests**

```bash
pnpm vitest run tests/unit/reporter/
```

Expected: All tests PASS.

- [ ] **Step 9: Commit**

```bash
git add src/reporter/ tests/unit/reporter/
git commit -m "feat: reporter (JSON, Markdown, HTML dashboard, scan history)"
```

---

## Task 13: CLI Commands

**Files:**
- Create: `src/cli/output.ts`
- Create: `src/cli/flags.ts`
- Create: `src/cli/commands/init.ts`
- Create: `src/cli/commands/scan.ts`
- Create: `src/cli/commands/fix.ts`
- Create: `src/cli/commands/review.ts`
- Create: `src/cli/commands/report.ts`
- Create: `src/cli/index.ts`

- [ ] **Step 1: Create `src/cli/output.ts`**

```typescript
import chalk from "chalk";

export function printBanner(): void {
  console.log(chalk.bold("\n  Surgeon AI — Codebase Audit & Repair\n"));
}

export function printScanSummary(summary: { totalFindings: number; bySeverity: Record<string, number>; healthScore: number; fixable: number; autoFixable: number }): void {
  console.log(chalk.bold(`\n  Health Score: ${summary.healthScore}/100\n`));
  for (const [sev, count] of Object.entries(summary.bySeverity)) {
    const color = sev === "critical" || sev === "high" ? chalk.red : sev === "medium" ? chalk.yellow : chalk.gray;
    const bar = "#".repeat(Math.min(count, 30));
    console.log(`  ${color(`${sev.padEnd(10)} ${String(count).padStart(3)}  ${bar}`)}`);
  }
  console.log(`\n  Fixable: ${summary.fixable}/${summary.totalFindings} (${summary.autoFixable} auto-fixable)\n`);
}

export function printError(message: string): void {
  console.error(chalk.red(`\n  Error: ${message}\n`));
}

export function printSuccess(message: string): void {
  console.log(chalk.green(`  ${message}`));
}

export function printInfo(message: string): void {
  console.log(chalk.gray(`  ${message}`));
}
```

- [ ] **Step 2: Create `src/cli/flags.ts`**

```typescript
import { Option } from "commander";

export const branchFlag = new Option("-b, --branch", "Scope to current branch changes only");
export const baseFlag = new Option("--base <branch>", "Base branch for -b comparison").default("main");
export const modeFlag = new Option("--mode <mode>", "Audit mode").choices(["full", "security", "performance", "tests", "reliability", "maintainability"]).default("full");
export const depthFlag = new Option("--depth <depth>", "Analysis depth").choices(["shallow", "standard", "deep"]).default("standard");
export const formatFlag = new Option("--format <format>", "Output format").choices(["json", "md", "html", "all"]).default("all");
export const outputFlag = new Option("--output <dir>", "Report output directory").default("surgeon-tests");
export const autoFixFlag = new Option("--auto-fix", "Scan then auto-fix high confidence issues");
export const yesFlag = new Option("--yes", "Auto-approve high-confidence fixes");
export const confidenceFlag = new Option("--confidence <level>", "Minimum confidence for auto-approve").choices(["high", "medium", "low"]).default("high");
export const includeFlag = new Option("--include <glob>", "Only scan matching paths");
export const excludeFlag = new Option("--exclude <glob>", "Skip matching paths");
export const langFlag = new Option("--lang <lang>", "Override language detection");
```

- [ ] **Step 3: Create `src/cli/commands/init.ts`**

```typescript
import fs from "fs/promises";
import path from "path";
import { DEFAULT_CONFIG } from "../../config/defaults.js";
import { printSuccess, printInfo } from "../output.js";

export async function initCommand(): Promise<void> {
  const surgeonDir = path.resolve(".surgeon");
  await fs.mkdir(surgeonDir, { recursive: true });
  const configPath = path.join(surgeonDir, "config.json");

  try {
    await fs.access(configPath);
    printInfo(".surgeon/config.json already exists, skipping.");
  } catch {
    await fs.writeFile(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf-8");
    printSuccess("Created .surgeon/config.json with default settings.");
  }
}
```

- [ ] **Step 4: Create `src/cli/commands/scan.ts`**

```typescript
import path from "path";
import fs from "fs/promises";
import ora from "ora";
import { loadConfig, mergeCliFlags } from "../../config/index.js";
import { analyze, type AnalyzeOptions } from "../../analyzer/index.js";
import { generateReports } from "../../reporter/index.js";
import { getChangedFiles, getBaseBranch } from "../../git/index.js";
import { printBanner, printScanSummary, printSuccess, printInfo, printError } from "../output.js";
import type { AuditMode } from "../../profiles/types.js";

interface ScanFlags {
  branch?: boolean;
  base?: string;
  mode?: string;
  depth?: string;
  format?: string;
  output?: string;
  autoFix?: boolean;
  include?: string;
  exclude?: string;
  lang?: string;
}

export async function scanCommand(targetPath: string, flags: ScanFlags): Promise<void> {
  printBanner();
  const projectPath = path.resolve(targetPath || ".");
  const config = await loadConfig(projectPath);

  const spinner = ora("Discovering files...").start();

  let changedFiles: string[] | undefined;
  let scope: "full" | "branch" = "full";

  if (flags.branch) {
    scope = "branch";
    const base = flags.base ?? config.base ?? (await getBaseBranch(projectPath));
    changedFiles = await getChangedFiles(projectPath, base);
    spinner.text = `Branch scan: ${changedFiles.length} changed files vs ${base}`;
  }

  const analyzeOptions: AnalyzeOptions = {
    projectPath,
    config,
    mode: (flags.mode ?? config.mode ?? "full") as AuditMode | "full",
    depth: (flags.depth ?? config.depth ?? "standard") as "shallow" | "standard" | "deep",
    scope,
    changedFiles,
    onProgress: (progress) => {
      spinner.text = `Auditing... ${progress.completed}/${progress.total} modules (${progress.active.join(", ")})`;
    },
  };

  try {
    const result = await analyze(analyzeOptions);
    spinner.succeed(`Scan complete in ${(result.meta.duration / 1000).toFixed(1)}s`);

    printScanSummary(result.summary);

    // Save last scan
    const surgeonDir = path.join(projectPath, ".surgeon");
    await fs.mkdir(surgeonDir, { recursive: true });
    await fs.writeFile(
      path.join(surgeonDir, "last-scan.json"),
      JSON.stringify(result, null, 2),
      "utf-8",
    );

    // Generate reports
    const outputDir = path.resolve(projectPath, flags.output ?? config.output);
    const format = (flags.format ?? "all") as "json" | "md" | "html" | "all";
    await generateReports(result, { output: outputDir, format });

    printSuccess(`Reports saved to ${outputDir}/`);
    printInfo("Next: srgn review | srgn fix . | srgn fix . --yes");
  } catch (err) {
    spinner.fail("Scan failed");
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
```

- [ ] **Step 5: Create `src/cli/commands/fix.ts`**

```typescript
import path from "path";
import fs from "fs/promises";
import readline from "readline";
import ora from "ora";
import { planFixes } from "../../fixer/planner.js";
import { BranchGuardImpl } from "../../fixer/guard.js";
import { applyFixes } from "../../fixer/applier.js";
import { validate } from "../../fixer/validator.js";
import { commitFixes } from "../../fixer/committer.js";
import { loadConfig } from "../../config/index.js";
import { getChangedFiles, getBaseBranch } from "../../git/index.js";
import { printBanner, printSuccess, printError, printInfo } from "../output.js";
import type { ScanResult } from "../../types/scan.js";
import type { FixOptions } from "../../types/fix.js";

interface FixFlags {
  branch?: boolean;
  base?: string;
  yes?: boolean;
  confidence?: string;
}

async function promptUser(message: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`  ${message} `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

export async function fixCommand(targetPath: string, flags: FixFlags): Promise<void> {
  printBanner();
  const projectPath = path.resolve(targetPath || ".");
  const config = await loadConfig(projectPath);

  // Read last scan
  const lastScanPath = path.join(projectPath, ".surgeon", "last-scan.json");
  let scanResult: ScanResult;
  try {
    const raw = await fs.readFile(lastScanPath, "utf-8");
    scanResult = JSON.parse(raw);
  } catch {
    printError("No scan results found. Run 'srgn scan .' first.");
    process.exit(1);
  }

  // Check for TUI selections
  let selectedIds: string[] | undefined;
  try {
    const selectionsRaw = await fs.readFile(path.join(projectPath, ".surgeon", "selected-fixes.json"), "utf-8");
    const selections = JSON.parse(selectionsRaw);
    if (selections.selectedIds?.length > 0) {
      selectedIds = selections.selectedIds;
      printInfo(`Using ${selectedIds.length} selections from srgn review`);
    }
  } catch {
    // No selections
  }

  let scope: "full" | "branch" = "full";
  if (flags.branch) {
    scope = "branch";
    const base = flags.base ?? config.base ?? (await getBaseBranch(projectPath));
    const changed = await getChangedFiles(projectPath, base);
    scanResult.meta.changedFiles = changed;
  }

  const fixOptions: FixOptions = {
    scope,
    autoApprove: flags.yes ?? false,
    confidenceThreshold: (flags.confidence ?? config.fix.autoApproveConfidence) as "high" | "medium" | "low",
    selectedIds,
    dryRun: false,
  };

  const plan = planFixes(scanResult, fixOptions);
  printInfo(`Found ${plan.fixes.length} fixable (${plan.skipped.length} skipped)`);

  if (plan.fixes.length === 0) {
    printInfo("Nothing to fix.");
    return;
  }

  // Create branch guard
  const guard = new BranchGuardImpl(projectPath, config.fix.branchPrefix);
  const spinner = ora("Creating fix branch...").start();

  try {
    await guard.create();
    spinner.succeed(`Fix branch: ${guard.fixBranch}`);

    // Apply fixes
    const results = await applyFixes(projectPath, plan, promptUser);

    const applied = results.filter((r) => r.status === "applied");
    const failed = results.filter((r) => r.status === "failed");
    const rejected = results.filter((r) => r.status === "rejected");

    // Validate
    if (applied.length > 0) {
      const modifiedFiles = applied.flatMap((r) => r.filesModified);
      const hasTS = scanResult.meta.project.languages.includes("typescript");
      const validation = await validate(projectPath, modifiedFiles, hasTS);

      if (validation.typeCheck.passed) printSuccess("Type check passed");
      else printError(`Type check failed: ${validation.typeCheck.errors.length} errors`);
      if (validation.testRun.passed) printSuccess("Tests passed");

      // Commit
      await commitFixes(projectPath, results, plan);
    }

    await guard.complete();

    printSuccess(`Applied: ${applied.length} | Failed: ${failed.length} | Rejected: ${rejected.length}`);
    printInfo(`\nTo review: git diff ${guard.originalBranch}...${guard.fixBranch}`);
    printInfo(`To merge:  git checkout ${guard.originalBranch} && git merge ${guard.fixBranch}`);
    printInfo(`To discard: git checkout ${guard.originalBranch} && git branch -D ${guard.fixBranch}`);
  } catch (err) {
    spinner.fail("Fix failed");
    await guard.rollback();
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
```

- [ ] **Step 6: Create `src/cli/commands/review.ts`**

```typescript
import path from "path";
import fs from "fs/promises";
import { printError } from "../output.js";
import type { ScanResult } from "../../types/scan.js";

export async function reviewCommand(): Promise<void> {
  const lastScanPath = path.resolve(".surgeon", "last-scan.json");
  let scanResult: ScanResult;
  try {
    const raw = await fs.readFile(lastScanPath, "utf-8");
    scanResult = JSON.parse(raw);
  } catch {
    printError("No scan results found. Run 'srgn scan .' first.");
    process.exit(1);
  }

  // Dynamic import Ink TUI to avoid loading React for non-TUI commands
  const { renderApp } = await import("../../tui/App.js");
  renderApp(scanResult);
}
```

- [ ] **Step 7: Create `src/cli/commands/report.ts`**

```typescript
import path from "path";
import fs from "fs/promises";
import { generateReports } from "../../reporter/index.js";
import { printSuccess, printError } from "../output.js";
import type { ScanResult } from "../../types/scan.js";

interface ReportFlags {
  format?: string;
  output?: string;
}

export async function reportCommand(flags: ReportFlags): Promise<void> {
  const lastScanPath = path.resolve(".surgeon", "last-scan.json");
  let scanResult: ScanResult;
  try {
    const raw = await fs.readFile(lastScanPath, "utf-8");
    scanResult = JSON.parse(raw);
  } catch {
    printError("No scan results found. Run 'srgn scan .' first.");
    process.exit(1);
  }

  const outputDir = flags.output ?? "surgeon-tests";
  const format = (flags.format ?? "all") as "json" | "md" | "html" | "all";
  await generateReports(scanResult, { output: outputDir, format });
  printSuccess(`Reports regenerated in ${outputDir}/`);
}
```

- [ ] **Step 8: Create `src/cli/index.ts`**

```typescript
import { Command } from "commander";
import { branchFlag, baseFlag, modeFlag, depthFlag, formatFlag, outputFlag, autoFixFlag, yesFlag, confidenceFlag, includeFlag, excludeFlag, langFlag } from "./flags.js";
import { scanCommand } from "./commands/scan.js";
import { fixCommand } from "./commands/fix.js";
import { reviewCommand } from "./commands/review.js";
import { reportCommand } from "./commands/report.js";
import { initCommand } from "./commands/init.js";

export function createProgram(): Command {
  const program = new Command();

  program
    .name("srgn")
    .description("Surgeon AI — Codebase Audit & Repair CLI")
    .version("0.1.0");

  program
    .command("scan [path]")
    .description("Run comprehensive audit on a codebase")
    .addOption(branchFlag)
    .addOption(baseFlag)
    .addOption(modeFlag)
    .addOption(depthFlag)
    .addOption(formatFlag)
    .addOption(outputFlag)
    .addOption(autoFixFlag)
    .addOption(includeFlag)
    .addOption(excludeFlag)
    .addOption(langFlag)
    .action(scanCommand);

  program
    .command("fix [path]")
    .description("Apply fixes from last scan on isolated branch")
    .addOption(branchFlag)
    .addOption(baseFlag)
    .addOption(yesFlag)
    .addOption(confidenceFlag)
    .action(fixCommand);

  program
    .command("review")
    .description("Interactive TUI to browse and select findings")
    .action(reviewCommand);

  program
    .command("report")
    .description("Regenerate reports from last scan data")
    .addOption(formatFlag)
    .addOption(outputFlag)
    .action(reportCommand);

  program
    .command("init")
    .description("Create .surgeon/ config in project")
    .action(initCommand);

  return program;
}
```

- [ ] **Step 9: Verify build compiles**

```bash
pnpm run build
```

Expected: dist/srgn.js created successfully.

- [ ] **Step 10: Commit**

```bash
git add src/cli/
git commit -m "feat: CLI commands (scan, fix, review, report, init) with Commander.js"
```

---

## Task 14: TUI (Interactive Review)

**Files:**
- Create: `src/tui/state.ts`
- Create: `src/tui/hooks/useKeyboard.ts`
- Create: `src/tui/hooks/useFilter.ts`
- Create: `src/tui/hooks/useScroll.ts`
- Create: `src/tui/components/KeyHints.tsx`
- Create: `src/tui/components/HealthBar.tsx`
- Create: `src/tui/components/FindingRow.tsx`
- Create: `src/tui/components/FilterBar.tsx`
- Create: `src/tui/components/CodeBlock.tsx`
- Create: `src/tui/components/DiffView.tsx`
- Create: `src/tui/components/SearchInput.tsx`
- Create: `src/tui/views/ListView.tsx`
- Create: `src/tui/views/DetailView.tsx`
- Create: `src/tui/views/SummaryView.tsx`
- Create: `src/tui/App.tsx`

This task creates the Ink-based TUI. Due to the visual nature and Ink's test approach, the TUI is tested via the integration test in Task 16. Each component is kept under 150 lines per the spec's file size guidelines.

- [ ] **Step 1: Create `src/tui/state.ts`**

```typescript
import { createContext, useContext } from "react";
import type { ScanResult } from "../types/scan.js";
import type { Finding } from "../types/finding.js";

export interface Filters {
  severity: string;
  mode: string;
  fixable: "all" | "fixable" | "auto-fixable";
  search: string;
}

export const defaultFilters: Filters = {
  severity: "all",
  mode: "all",
  fixable: "all",
  search: "",
};

export interface TuiState {
  scanResult: ScanResult;
  filters: Filters;
  selectedIds: Set<string>;
  focusedIndex: number;
  filteredFindings: Finding[];
}

export const TuiContext = createContext<{
  state: TuiState;
  dispatch: (action: TuiAction) => void;
}>(null!);

export type TuiAction =
  | { type: "SET_FILTER"; filters: Partial<Filters> }
  | { type: "TOGGLE_SELECTED"; id: string }
  | { type: "SELECT_ALL" }
  | { type: "SELECT_NONE" }
  | { type: "SET_FOCUS"; index: number }
  | { type: "MOVE_FOCUS"; delta: number };

export function useTui() {
  return useContext(TuiContext);
}
```

- [ ] **Step 2: Create TUI hooks**

Create `src/tui/hooks/useKeyboard.ts`, `src/tui/hooks/useFilter.ts`, `src/tui/hooks/useScroll.ts`.

Each hook is ~40-60 lines. `useFilter` applies filters to findings. `useScroll` manages viewport offset for long lists. `useKeyboard` handles key events via Ink's `useInput`.

- [ ] **Step 3: Create TUI components**

Create all component files under `src/tui/components/`. Each is a focused React component:

- `KeyHints.tsx` — renders the bottom keyboard shortcut bar
- `HealthBar.tsx` — visual `[#####-----]` health bar
- `FindingRow.tsx` — single finding row with severity color, checkbox, title
- `FilterBar.tsx` — severity/mode/fixable radio buttons
- `CodeBlock.tsx` — renders code with line numbers
- `DiffView.tsx` — unified diff with +/- coloring
- `SearchInput.tsx` — text input for fuzzy search

- [ ] **Step 4: Create TUI views**

Create `src/tui/views/ListView.tsx`, `src/tui/views/DetailView.tsx`, `src/tui/views/SummaryView.tsx`.

- `ListView` — filter bar + scrollable findings list + key hints
- `DetailView` — full finding detail with evidence, diff, references
- `SummaryView` — pre-fix confirmation with selected findings summary

- [ ] **Step 5: Create `src/tui/App.tsx`**

```typescript
import React, { useState, useReducer, useMemo } from "react";
import { render, Box, Text } from "ink";
import type { ScanResult } from "../types/scan.js";
import type { Finding } from "../types/finding.js";
import { TuiContext, defaultFilters, type TuiState, type TuiAction, type Filters } from "./state.js";
import { ListView } from "./views/ListView.js";
import { DetailView } from "./views/DetailView.js";
import { SummaryView } from "./views/SummaryView.js";
import fs from "fs/promises";
import path from "path";

function filterFindings(findings: Finding[], filters: Filters): Finding[] {
  return findings.filter((f) => {
    if (filters.severity !== "all" && f.severity !== filters.severity) return false;
    if (filters.mode !== "all" && f.mode !== filters.mode) return false;
    if (filters.fixable === "fixable" && !f.fix) return false;
    if (filters.fixable === "auto-fixable" && (!f.fix || f.fix.confidence !== "high")) return false;
    if (filters.search && !`${f.title} ${f.file} ${f.description}`.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });
}

function reducer(state: TuiState, action: TuiAction): TuiState {
  switch (action.type) {
    case "SET_FILTER": {
      const filters = { ...state.filters, ...action.filters };
      const allFindings = [...state.scanResult.findings, ...state.scanResult.crossModuleFindings];
      return { ...state, filters, filteredFindings: filterFindings(allFindings, filters), focusedIndex: 0 };
    }
    case "TOGGLE_SELECTED": {
      const next = new Set(state.selectedIds);
      next.has(action.id) ? next.delete(action.id) : next.add(action.id);
      return { ...state, selectedIds: next };
    }
    case "SELECT_ALL":
      return { ...state, selectedIds: new Set(state.filteredFindings.map((f) => f.id)) };
    case "SELECT_NONE":
      return { ...state, selectedIds: new Set() };
    case "SET_FOCUS":
      return { ...state, focusedIndex: Math.max(0, Math.min(action.index, state.filteredFindings.length - 1)) };
    case "MOVE_FOCUS":
      return { ...state, focusedIndex: Math.max(0, Math.min(state.focusedIndex + action.delta, state.filteredFindings.length - 1)) };
    default:
      return state;
  }
}

function App({ scanResult }: { scanResult: ScanResult }) {
  const [view, setView] = useState<"list" | "detail" | "summary">("list");
  const allFindings = useMemo(() => [...scanResult.findings, ...scanResult.crossModuleFindings], [scanResult]);

  const [state, dispatch] = useReducer(reducer, {
    scanResult,
    filters: defaultFilters,
    selectedIds: new Set<string>(),
    focusedIndex: 0,
    filteredFindings: allFindings,
  });

  const handleQuit = async () => {
    if (state.selectedIds.size > 0) {
      const selection = {
        scanId: scanResult.meta.timestamp,
        timestamp: new Date().toISOString(),
        selectedIds: [...state.selectedIds],
      };
      await fs.writeFile(path.resolve(".surgeon", "selected-fixes.json"), JSON.stringify(selection, null, 2), "utf-8");
    }
    process.exit(0);
  };

  return (
    <TuiContext.Provider value={{ state, dispatch }}>
      <Box flexDirection="column">
        {view === "list" && (
          <ListView
            onSelectDetail={(idx) => { dispatch({ type: "SET_FOCUS", index: idx }); setView("detail"); }}
            onExecute={() => setView("summary")}
            onQuit={handleQuit}
          />
        )}
        {view === "detail" && <DetailView onBack={() => setView("list")} />}
        {view === "summary" && <SummaryView onBack={() => setView("list")} onQuit={handleQuit} />}
      </Box>
    </TuiContext.Provider>
  );
}

export function renderApp(scanResult: ScanResult): void {
  render(<App scanResult={scanResult} />);
}
```

- [ ] **Step 6: Verify build compiles with TSX**

```bash
pnpm run build
```

Expected: Compiles successfully.

- [ ] **Step 7: Commit**

```bash
git add src/tui/
git commit -m "feat: interactive TUI (ListView, DetailView, SummaryView) with Ink"
```

---

## Task 15: Test Fixtures & Integration Tests

**Files:**
- Create: `tests/fixtures/sample-project/package.json`
- Create: `tests/fixtures/sample-project/tsconfig.json`
- Create: `tests/fixtures/sample-project/src/index.ts`
- Create: `tests/fixtures/sample-project/src/auth/login.ts`
- Create: `tests/fixtures/sample-project/src/utils/parse.ts`
- Create: `tests/fixtures/claude-responses/security-scan.json`
- Create: `tests/integration/scan.test.ts`

- [ ] **Step 1: Create sample project fixture**

Create `tests/fixtures/sample-project/package.json`:

```json
{
  "name": "sample-project",
  "version": "1.0.0",
  "dependencies": { "express": "4.18.0" }
}
```

Create `tests/fixtures/sample-project/tsconfig.json`:

```json
{
  "compilerOptions": { "target": "ES2022", "module": "ESNext", "paths": { "@/*": ["./src/*"] } }
}
```

Create `tests/fixtures/sample-project/src/index.ts`:

```typescript
import { loginUser } from "./auth/login";
export { loginUser };
```

Create `tests/fixtures/sample-project/src/auth/login.ts`:

```typescript
export async function loginUser(id: string) {
  const query = `SELECT * FROM users WHERE id = ${id}`;
  return query;
}
```

Create `tests/fixtures/sample-project/src/utils/parse.ts`:

```typescript
export function parseInput(data: unknown) {
  return data as any;
}
```

- [ ] **Step 2: Create mock Claude response fixture**

Create `tests/fixtures/claude-responses/security-scan.json`:

```json
{
  "findings": [
    {
      "id": "",
      "file": "src/auth/login.ts",
      "line": 2,
      "severity": "critical",
      "mode": "security",
      "title": "SQL injection via string interpolation",
      "description": "User input directly interpolated into SQL query",
      "evidence": "const query = `SELECT * FROM users WHERE id = ${id}`",
      "suggestion": "Use parameterized queries",
      "confidence": "high",
      "fix": {
        "description": "Use parameterized query",
        "diff": [{
          "file": "src/auth/login.ts",
          "oldCode": "const query = `SELECT * FROM users WHERE id = ${id}`",
          "newCode": "const query = \"SELECT * FROM users WHERE id = $1\";\n  const params = [id]",
          "startLine": 2,
          "endLine": 2
        }],
        "confidence": "high",
        "breaking": false
      }
    }
  ],
  "moduleSummary": "Critical SQL injection found",
  "healthScore": 30
}
```

- [ ] **Step 3: Write integration test for discovery + graph**

Create `tests/integration/scan.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import path from "path";
import { detectProject } from "@/discovery/detector.js";
import { walkFiles } from "@/discovery/walker.js";
import { buildDepGraph } from "@/graph/index.js";

const FIXTURE_PATH = path.resolve(__dirname, "../fixtures/sample-project");

describe("scan integration", () => {
  it("discovers project and detects Express", async () => {
    const project = await detectProject(FIXTURE_PATH);
    expect(project.frameworks).toContain("express");
    expect(project.name).toBe("sample-project");
  });

  it("walks source files excluding node_modules", async () => {
    const files = await walkFiles(FIXTURE_PATH, [], []);
    expect(files.length).toBeGreaterThan(0);
    expect(files.every((f) => !f.includes("node_modules"))).toBe(true);
  });

  it("builds dependency graph with imports", async () => {
    const files = await walkFiles(FIXTURE_PATH, [], []);
    const { graph, clusters } = await buildDepGraph(FIXTURE_PATH, files);
    expect(graph.nodes.size).toBeGreaterThan(0);
    expect(clusters.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 4: Run integration tests**

```bash
pnpm vitest run tests/integration/scan.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/fixtures/ tests/integration/
git commit -m "feat: test fixtures and integration tests for scan pipeline"
```

---

## Task 16: Final Build, Smoke Test & Entry Point

**Files:**
- Modify: `bin/srgn.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Ensure `bin/srgn.ts` imports correctly**

Verify `bin/srgn.ts` matches:

```typescript
import { createProgram } from "../src/cli/index.js";

const program = createProgram();
program.parse(process.argv);
```

- [ ] **Step 2: Update `src/index.ts` with all public exports**

```typescript
export type { Finding, ProposedFix, FileDiff, Severity, AuditMode as FindingMode, Confidence } from "./types/finding.js";
export type { ScanResult, ScanMeta, ScanSummary, ProjectInfo, ModuleScan } from "./types/scan.js";
export type { SurgeonConfig } from "./types/config.js";
export type { DepGraph, FileNode, Edge } from "./types/graph.js";
export type { FixPlan, FixResult, FixOptions } from "./types/fix.js";
export { analyze } from "./analyzer/index.js";
export { generateReports } from "./reporter/index.js";
export { createProgram } from "./cli/index.js";
```

- [ ] **Step 3: Run full test suite**

```bash
pnpm vitest run
```

Expected: All unit and integration tests PASS.

- [ ] **Step 4: Build**

```bash
pnpm run build
```

Expected: `dist/srgn.js` created without errors.

- [ ] **Step 5: Smoke test CLI**

```bash
node dist/srgn.js --version
node dist/srgn.js --help
node dist/srgn.js scan --help
node dist/srgn.js fix --help
```

Expected: Version prints `0.1.0`. Help shows all commands and flags.

- [ ] **Step 6: Smoke test init command**

```bash
cd /tmp && mkdir surgeon-smoke && cd surgeon-smoke && node D:/surgeon/dist/srgn.js init
```

Expected: Creates `.surgeon/config.json` with default config.

- [ ] **Step 7: Run typecheck**

```bash
pnpm run typecheck
```

Expected: No type errors.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: finalize entry point, public API exports, smoke tests pass"
```

---

## Summary

| Task | Module | Files | Tests |
|------|--------|-------|-------|
| 1 | Scaffolding | 9 config files | Build verification |
| 2 | Types | 5 type files | Typecheck |
| 3 | Config | 3 files | 4 unit tests |
| 4 | Git Helper | 4 files | Typecheck |
| 5 | Discovery | 4 files | 4 unit tests |
| 6 | Graph Parser/Resolver | 2 files | 14 unit tests |
| 7 | Graph Builder/Cycles/Cluster | 4 files | 5 unit tests |
| 8 | Claude Bridge | 5 files | 6 unit tests |
| 9 | Framework Profiles | 11 files | 4 unit tests |
| 10 | Analyzer | 5 files | Typecheck |
| 11 | Fixer | 6 files | 5 unit tests |
| 12 | Reporter | 8 files | 3 unit tests |
| 13 | CLI Commands | 8 files | Build verification |
| 14 | TUI | 16 files | Build verification |
| 15 | Test Fixtures | 7 files | 3 integration tests |
| 16 | Final | 2 files | Smoke tests |

**Total: ~100 files, 48+ automated tests, 16 tasks**
