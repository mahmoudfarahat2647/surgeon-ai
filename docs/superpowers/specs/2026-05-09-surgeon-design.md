# Surgeon AI — Design Specification

**Package:** `surgeon-ai` (npm)
**CLI command:** `srgn`
**Tagline:** AI-Powered Codebase Audit & Repair CLI
**Date:** 2026-05-09
**Status:** Approved

---

## 1. Overview

Surgeon AI is a comprehensive CLI tool that audits codebases for bugs, security vulnerabilities, performance issues, reliability problems, maintainability concerns, and test coverage gaps. It uses Claude Code (`claude -p`) as its AI backend, acting as a thin orchestrator that breaks work into phases and delegates reasoning to Claude.

### Core Value Proposition

- **Comprehensive audit** — security, reliability, performance, maintainability, testing
- **Dependency-aware scanning** — builds import graph for Node.js/Next.js, scans in topological order
- **Branch-scoped operations** — scan/fix only files changed in current branch (`-b` flag)
- **Confidence-tiered fixes** — high-confidence auto-apply on isolated branch, medium/low require approval
- **Rich output** — JSON + Markdown + HTML dashboard + interactive TUI
- **Framework-aware** — built-in profiles for React, Next.js, Express, Fastify, NestJS

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| AI backend | Claude Code CLI (`claude -p`) | Handles tool use, context, streaming — no need to reimplement |
| Architecture | Orchestrator pattern | Surgeon owns workflow; Claude handles reasoning |
| Dep graph scope | Node.js/Next.js only (MVP) | Feasible to parse imports; other ecosystems fall back to directory chunking |
| Fix safety | Confidence-tiered on isolated branch | Never touches working branch; user controls approval threshold |
| Target audience | Solo developers first (MVP) | Zero-config experience; CI/CD integration in v1.1 |
| MCP server | Not in MVP | CLI-first; MCP wraps cleanly later due to clean command boundaries |
| Distribution | npm (`surgeon-ai`), command `srgn` | Short CLI command, available package name |

---

## 2. CLI Interface

### Commands

| Command | Description |
|---------|------------|
| `srgn scan [path]` | Full comprehensive audit |
| `srgn -b scan [path]` | Branch scan — only files changed vs base branch |
| `srgn fix [path]` | Apply fixes from last scan (on `surgeon/fix-*` branch) |
| `srgn -b fix [path]` | Branch fix — only fix files changed in current branch |
| `srgn review` | Interactive TUI to browse, filter, and select findings |
| `srgn report` | Regenerate reports from last scan data |
| `srgn init` | Create `.surgeon/` config in project |

### Global Flags

| Flag | Description |
|------|------------|
| `-b, --branch` | Scope to current branch changes only (git diff vs base) |
| `--base <branch>` | Base branch for `-b` comparison (default: `main` or `master`) |

### `srgn scan` Flags

| Flag | Description |
|------|------------|
| `--mode <full\|security\|performance\|tests\|reliability\|maintainability>` | Audit category filter |
| `--depth <shallow\|standard\|deep>` | Analysis thoroughness |
| `--lang <ts\|js\|py\|...>` | Override language detection |
| `--include <glob>` | Only scan matching paths |
| `--exclude <glob>` | Skip matching paths |
| `--auto-fix` | Scan then auto-fix (high confidence, on isolated branch) |
| `--parallel <n>` | Max concurrent Claude calls (default: 3) |
| `--format <json\|md\|html\|all>` | Output format (default: all) |
| `--output <dir>` | Report output dir (default: `surgeon-tests/`) |

### `srgn fix` Flags

| Flag | Description |
|------|------------|
| `--yes` | Auto-approve all high-confidence fixes |
| `--confidence <high\|medium\|low>` | Minimum confidence threshold to apply (default: `high` with `--yes`) |

### Execution Flows

**Full scan:**
```
srgn scan .
  -> Discover all files -> build dep graph -> chunk -> parallel audit -> cross-module pass -> report
```

**Branch scan:**
```
srgn -b scan .
  -> git diff --name-only main -> filter to changed files only
  -> build partial dep graph (changed files + direct dependents)
  -> audit only affected modules -> report
  -> Output header: "Branch scan: 12 changed files vs main"
```

**Full fix:**
```
srgn fix .
  -> Read .surgeon/last-scan.json
  -> Respect scan scope (if last scan was --mode security, only fix security issues)
  -> Create branch: surgeon/fix-<timestamp>
  -> Apply fixes by confidence tier -> present summary
```

**Branch fix with auto-approve:**
```
srgn -b fix . --yes
  -> Read .surgeon/last-scan.json
  -> Filter findings to branch-changed files only
  -> Create branch: surgeon/fix-<timestamp>
  -> Auto-apply high-confidence fixes -> prompt for medium/low
  -> Output header: "Branch fix: applied 8 fixes across 5 changed files"
```

### Example Usage

```bash
srgn scan .                           # Full audit, current dir
srgn scan ./src --mode security       # Security-only scan
srgn scan . --depth deep --parallel 5 # Deep scan, 5 parallel workers
srgn -b scan .                        # Scan only branch changes
srgn fix .                            # Fix on isolated branch
srgn fix . --yes                      # Auto-apply high-confidence fixes
srgn -b fix . --yes                   # Auto-fix branch changes only
srgn review                           # Open interactive TUI
```

---

## 3. Architecture

### System Architecture

```
+-------------------------------------------------------------------+
|                        srgn CLI (Node.js)                         |
|                                                                   |
|  +----------+  +----------+  +----------+  +-----------------+   |
|  | Commander|  |  Config   |  |   Git    |  |  Report Gen     |   |
|  | (CLI)    |  |  Loader   |  |  Helper  |  | (MD/JSON/HTML)  |   |
|  +----+-----+  +----+-----+  +----+-----+  +-------+---------+   |
|       |              |             |                 |             |
|  +----v--------------v-------------v-----------------v---------+  |
|  |                    Orchestrator                             |  |
|  |                                                             |  |
|  |  Phase 1: Discovery --> Phase 2: Dep Graph -->              |  |
|  |  Phase 3: Chunking --> Phase 4: Parallel Audit -->          |  |
|  |  Phase 5: Cross-Module Pass --> Phase 6: Report             |  |
|  +---------------------------+-----------------------------+---+  |
|                              |                                    |
|  +---------------------------v---------------------------------+  |
|  |              Claude Bridge                                  |  |
|  |  Spawns claude -p with crafted prompts                      |  |
|  |  Manages concurrency (--parallel N)                         |  |
|  |  Parses structured JSON responses                           |  |
|  +-------------------------------------------------------------+  |
|                                                                   |
|  +------------+  +------------+  +----------------------------+   |
|  |  TUI       |  |  Fixer     |  |  Framework Profiles        |   |
|  |  (Ink)     |  |  Engine    |  |  (React, Next, Express...) |   |
|  +------------+  +------------+  +----------------------------+   |
+-------------------------------------------------------------------+
```

### Module Breakdown

| Module | Responsibility |
|--------|---------------|
| **CLI** (`src/cli/`) | Command parsing (Commander.js), flag validation, entry points |
| **Config** (`src/config/`) | Load `.surgeon/config.json`, merge with CLI flags, detect languages/frameworks |
| **Git Helper** (`src/git/`) | `getChangedFiles(base)`, `createFixBranch()`, `getCurrentBranch()`, diff utilities |
| **Discovery** (`src/discovery/`) | Walk file tree, respect `.gitignore` + include/exclude, detect project type |
| **Dep Graph** (`src/graph/`) | Parse `import`/`require` for Node/Next.js, build adjacency list, topological sort |
| **Chunker** (`src/chunker/`) | Group files into scan units by module boundary or dep graph clusters |
| **Claude Bridge** (`src/bridge/`) | Spawn `claude -p`, manage concurrency pool, parse responses, retry on failure |
| **Framework Profiles** (`src/profiles/`) | Per-framework prompt templates (React, Next.js, Express, Fastify, etc.) |
| **Analyzer** (`src/analyzer/`) | Orchestrates phases 1-5, aggregates findings, deduplicates |
| **Fixer** (`src/fixer/`) | Reads scan results, classifies confidence, applies diffs on isolated branch |
| **Reporter** (`src/reporter/`) | Generates JSON, Markdown, and HTML reports to `surgeon-tests/` |
| **TUI** (`src/tui/`) | Interactive review interface built with Ink (React for CLI) |

### Data Flow: Full Scan

```
CLI parses args + config
  |
  v
Discovery: walk files, detect languages/frameworks
  |
  v
Dep Graph: parse imports (Node/Next.js) or dir-based fallback
  |
  v
Chunker: group into scan units (3-20 files each)
  |
  v
Parallel Audit: N concurrent claude -p calls (one per chunk)
  Each call includes: system role + output contract + base rules
    + framework profile + known pitfalls + dep context + file contents
  |
  v
Cross-Module Pass: one claude -p call with all findings + architecture context
  |
  v
Aggregate + Deduplicate findings
  |
  v
Generate reports: JSON + Markdown + HTML -> surgeon-tests/
  |
  v
Save metadata to .surgeon/last-scan.json
```

### Data Flow: Branch Scan

```
Git Helper: git diff --name-only main
  -> changedFiles = [src/auth/login.ts, src/api/users.ts, ...]
  -> Discovery scoped to changedFiles only
  -> Dep Graph includes changedFiles + their direct importers (blast radius)
  -> Rest of pipeline identical, but smaller scope
  -> Output tagged: scope: "branch", base: "main", changedFiles: [...]
```

### Concurrency Model

```
Claude Bridge manages a pool of N workers (default: 3)

  Worker 1: ######--- chunk A
  Worker 2: ####----- chunk B
  Worker 3: #######-- chunk C
             --------- chunk D    <- queued, starts when a worker frees
             --------- chunk E

Uses p-limit for concurrency control.
Each worker spawns: claude -p "..." --output-format json
```

---

## 4. Data Models

### Finding

The atomic unit of the system. Every issue Surgeon discovers is a Finding.

```typescript
interface Finding {
  id: string;                    // unique hash: sha256(file + line + rule)
  file: string;                  // relative path: "src/auth/login.ts"
  line: number;                  // start line
  endLine?: number;              // end line (for multi-line issues)
  column?: number;               // start column
  severity: "critical" | "high" | "medium" | "low" | "info";
  mode: "security" | "performance" | "reliability" | "maintainability" | "tests";
  title: string;                 // short: "SQL injection via string interpolation"
  description: string;           // detailed explanation of the issue
  evidence: string;              // the problematic code snippet
  suggestion: string;            // what should be done
  fix?: ProposedFix;             // machine-applicable fix (if Claude can generate one)
  confidence: "high" | "medium" | "low";
  framework?: string;            // "nextjs" | "express" | "react" | null
  rule?: string;                 // profile rule that triggered this: "react/xss-jsx"
  references?: string[];         // links to docs, CWEs, OWASP, etc.
}

interface ProposedFix {
  description: string;           // what this fix does
  diff: FileDiff[];              // the actual changes
  confidence: "high" | "medium" | "low";
  breaking: boolean;             // could this change behavior?
  testSuggestion?: string;       // suggested test to verify the fix
}

interface FileDiff {
  file: string;                  // target file path
  oldCode: string;               // exact string to replace
  newCode: string;               // replacement string
  startLine: number;
  endLine: number;
}
```

### Scan Result

```typescript
interface ScanResult {
  meta: ScanMeta;
  summary: ScanSummary;
  findings: Finding[];
  modules: ModuleScan[];
  crossModuleFindings: Finding[];
}

interface ScanMeta {
  version: string;               // surgeon-ai version
  timestamp: string;             // ISO 8601
  duration: number;              // scan duration in ms
  scope: "full" | "branch";
  base?: string;                 // base branch (if branch scan)
  changedFiles?: string[];       // files in scope (if branch scan)
  mode: string;                  // "full" | "security" | etc.
  depth: "shallow" | "standard" | "deep";
  path: string;                  // scanned path
  project: ProjectInfo;
  claudeModel: string;           // model used
  tokensUsed: number;            // total tokens consumed
}

interface ProjectInfo {
  name: string;                  // from package.json or dir name
  languages: string[];           // detected languages
  frameworks: string[];          // detected frameworks
  packageManager: "npm" | "yarn" | "pnpm" | "bun";
  nodeVersion?: string;
  totalFiles: number;
  scannedFiles: number;
}

interface ScanSummary {
  totalFindings: number;
  bySeverity: Record<Finding["severity"], number>;
  byMode: Record<Finding["mode"], number>;
  fixable: number;               // findings with a ProposedFix
  autoFixable: number;           // fixable + high confidence
  healthScore: number;           // 0-100, overall codebase health
}

interface ModuleScan {
  path: string;                  // "src/auth/"
  files: string[];
  findings: Finding[];
  healthScore: number;           // 0-100 per module
}
```

### File Formats

**`.surgeon/last-scan.json`** — persisted after every scan, read by `fix` command:
```jsonc
{
  "meta": { /* ScanMeta */ },
  "summary": { /* ScanSummary */ },
  "findings": [ /* Finding[] */ ],
  "crossModuleFindings": [ /* Finding[] */ ]
}
```

**`.surgeon/selected-fixes.json`** — written by TUI when user selects findings:
```jsonc
{
  "scanId": "abc123",
  "timestamp": "2026-05-09T...",
  "selectedIds": ["f1a2b3c4", "d5e6f7a8"]
}
```

**`.surgeon/config.json`** — project-level configuration:
```jsonc
{
  "base": "main",
  "parallel": 3,
  "depth": "standard",
  "exclude": ["node_modules", "dist", ".next", "coverage", "*.min.js"],
  "include": [],
  "mode": "full",
  "output": "surgeon-tests",
  "fix": {
    "autoApproveConfidence": "high",
    "branchPrefix": "surgeon/fix"
  },
  "profiles": {
    "react": true,
    "nextjs": true,
    "express": false
  }
}
```

### Report Outputs

```
surgeon-tests/
  audit.json          # Full ScanResult as JSON
  audit.md            # Human-readable Markdown report
  audit.html          # Interactive HTML dashboard
  history/            # Previous scan results
    2026-05-09T153000.json
```

---

## 5. Framework Profiles & Prompt Engineering

### Profile Interface

```typescript
interface FrameworkProfile {
  id: string;                          // "nextjs"
  name: string;                        // "Next.js"
  detect: (project: ProjectInfo) => boolean;
  promptFragments: Record<AuditMode, string>;
  filePatterns: string[];
  knownPitfalls: Pitfall[];
}

type AuditMode = "security" | "performance" | "reliability"
               | "maintainability" | "tests" | "full";

interface Pitfall {
  id: string;                 // "nextjs/unsafe-server-action"
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  codePattern?: string;       // regex hint for Claude
  references: string[];
}
```

### Built-in Profiles

| Profile | Detection Logic |
|---------|----------------|
| **Base** | Always included |
| **Node** | `package.json` exists |
| **TypeScript** | `tsconfig.json` exists or `.ts` files found |
| **React** | `react` in dependencies |
| **Next.js** | `next` in dependencies or `next.config.*` exists |
| **Express** | `express` in dependencies |
| **Fastify** | `fastify` in dependencies |
| **NestJS** | `@nestjs/core` in dependencies |
| **Testing** | Always included when `--mode tests` or `--mode full` |

### Prompt Assembly Pipeline

Prompts are assembled in layers for each chunk audit:

1. **System Role** — "You are a senior engineer performing a code audit"
2. **Output Contract** — JSON schema for structured response
3. **Base Audit Rules** — universal rules from `base.ts`
4. **Framework-Specific Rules** — merged from all detected profiles
5. **Known Pitfalls** — structured patterns to watch for
6. **Dependency Context** — what this module imports/exports, who depends on it
7. **File Contents** — the actual code being audited

### Key Profile Content Areas

**Base (universal):**
- Command injection, path traversal, prototype pollution
- Regex DoS, hardcoded secrets, insecure randomness
- N+1 queries, missing pagination, sync I/O in handlers
- Memory leaks, unnecessary re-computation

**Next.js:**
- Unvalidated Server Action inputs (critical — they're public HTTP endpoints)
- SSR data exposure (server components leaking secrets to client via props)
- Middleware matcher gaps (new routes bypassing auth)
- Bundle size (large client imports, missing next/dynamic)
- Missing error/loading/not-found boundaries

**React:**
- XSS via dangerouslySetInnerHTML
- Missing key props, stale closure bugs in hooks
- Unnecessary re-renders, missing memoization

**Express:**
- Missing input validation middleware
- Middleware ordering issues (auth after route handlers)
- Unhandled async errors in route handlers

### Cross-Module Prompt

Focuses on architectural issues only visible at system level:
- Inconsistent patterns across modules (auth handled differently)
- Missing integration points (error handling gaps)
- Data flow vulnerabilities (tainted data crossing boundaries)
- Circular dependencies, god modules, missing abstraction layers
- Duplicate logic across modules

---

## 6. Dependency Graph Engine

### Scope

Built specifically for Node.js/Next.js. Other ecosystems fall back to directory-based chunking.

### Graph Data Model

```typescript
interface DepGraph {
  nodes: Map<string, FileNode>;
  edges: Edge[];
  entryPoints: string[];
  leafNodes: string[];
  cycles: string[][];
}

interface FileNode {
  path: string;
  imports: string[];
  importedBy: string[];
  exports: ExportInfo[];
  moduleId: string;
  depth: number;
  size: number;
  language: "ts" | "tsx" | "js" | "jsx" | "mjs" | "cjs";
}

interface Edge {
  from: string;
  to: string;
  type: "static" | "dynamic" | "require" | "re-export";
  specifiers: string[];
}
```

### Import Resolution

Handles all Node.js/Next.js import styles:
- Relative imports (with/without extensions)
- tsconfig `paths` aliases (`@/`, `~/`, custom)
- `package.json` `imports` field
- CommonJS `require()`
- Dynamic `import()`
- Re-exports (`export * from`, `export { x } from`)

Resolution order:
1. Skip bare specifiers (npm packages) — not part of project graph
2. Resolve tsconfig paths aliases
3. Resolve relative path from importing file's directory
4. Try extensions in order: `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`
5. Try index files: `index.ts`, `index.tsx`, etc.

### Parsing Strategy

Regex-based parser (not full AST). Fast, handles all import/export patterns. Accuracy is sufficient for graph building — we don't need type resolution.

### Graph Building Pipeline

1. **Discover source files** — walk file tree, filter by extensions
2. **Load resolver config** — read `tsconfig.json` paths, `package.json` imports
3. **Parse all files** — parallel regex extraction of imports/exports
4. **Resolve imports** — convert specifiers to absolute paths
5. **Build adjacency list** — create nodes, edges, compute `importedBy`
6. **Detect cycles** — DFS-based cycle detection (cycles become findings)
7. **Cluster into modules** — group connected files into scan units
8. **Topological sort** — determine scan order (leaf modules first)

### Module Clustering

Files are grouped into scan units using directory-based clustering with dependency awareness:

1. Initial clustering by directory (max depth 2)
2. Merge small clusters (<3 files) with nearest neighbor (most import edges)
3. Split large clusters (>20 files) by sub-directory
4. Attach dependency context (external imports/exports for each cluster)

### Branch Scan: Partial Graph

For `srgn -b scan`, the graph includes the blast radius:
- Changed files themselves
- Direct importers (files that depend on changed files — may break)
- Direct imports (context for understanding changes — 1 level deep)

### Next.js Conventions

The graph engine understands Next.js file-system routing:
- Route segment files (`page`, `layout`, `loading`, `error`, `not-found`) cluster together
- API routes (`app/api/**`) form their own cluster
- `middleware.ts` is always its own scan unit (critical, scanned independently)
- Files with `"use server"` are flagged for extra scrutiny

### Cycle Detection

Circular dependencies are detected via DFS and reported as maintainability findings with `confidence: "high"`.

---

## 7. Fixer Engine & Branch Safety

### Fix Pipeline

```
Plan -> Guard -> Apply -> Validate -> Commit
```

1. **Plan** — read last scan, filter by scope/mode/selection, classify confidence, order by severity
2. **Guard** — stash uncommitted changes, create `surgeon/fix-<timestamp>` branch
3. **Apply** — execute fixes one by one with per-fix rollback on failure
4. **Validate** — syntax check, type check (tsc), lint (eslint), tests (npm test)
5. **Commit** — group applied fixes by mode into clean commits

### Confidence-Tiered Approval

| Confidence | With `--yes` | Without `--yes` |
|-----------|-------------|-----------------|
| High | Auto-apply | Prompt user |
| Medium | Prompt user | Prompt user |
| Low | Prompt user | Prompt user |

The `--confidence` flag adjusts the auto-apply threshold with `--yes`.

### Context-Aware Fixing

The fix command reads `.surgeon/last-scan.json` metadata:
- If last scan was `--mode security`, only security findings are fixed
- If last scan was branch-scoped, only branch-changed files are targeted
- If TUI selections exist in `.surgeon/selected-fixes.json`, only those IDs are fixed

### Branch Isolation

Every fix operation creates `surgeon/fix-<timestamp>` from current HEAD. The working branch is never modified directly.

If user has uncommitted changes:
- Auto-stash before fix (`git stash push -m 'surgeon: auto-stash before fix'`)
- Restore stash to original branch after fix completes

### Per-Fix Rollback

Each fix is applied individually:
1. Snapshot current file state
2. Apply diff (string replacement)
3. Syntax check the modified file
4. If syntax check fails, restore snapshot and mark fix as "failed"
5. Continue to next fix

### Post-Fix Validation

After all fixes are applied:

| Check | Tool | Behavior on failure |
|-------|------|-------------------|
| Syntax | Node parser | Mark overall as "fail" |
| Types | `tsc --noEmit` | Mark overall as "fail" |
| Lint | `eslint` | Mark overall as "partial" |
| Tests | `npm test` | Mark overall as "partial" |

### Rollback Strategy

| Level | Trigger | Action |
|-------|---------|--------|
| Per-fix | Single fix fails syntax check | Restore file snapshot, continue |
| Per-session | User aborts (Ctrl+C) | SIGINT handler restores snapshots, return to original branch |
| Per-branch | User doesn't like results | `git branch -D surgeon/fix-*` |
| Stash safety | User had uncommitted work | Auto-stash before, auto-restore after |

### Edge Cases

- **File modified since scan** — skip fix, warn "re-run srgn scan first"
- **Fix branch already exists** — append incremental number
- **No test script** — skip test validation, warn user
- **Detached HEAD** — refuse to fix, require checkout
- **Fix conflicts with prior fix** — sequential application, skip if `oldCode` no longer matches

### Terminal Output

```
$ srgn fix .

Reading last scan results...
  Scan: 2026-05-09T15:30:00Z | Mode: full | Scope: full
  Found 18 findings (14 fixable, 10 auto-fixable)

Creating fix branch: surgeon/fix-1715270400
  Stashed 2 uncommitted changes

Applying fixes...

  ok [CRIT-001] SQL injection in src/auth/login.ts:42         [auto-applied]
  ok [CRIT-002] XSS via dangerouslySetInnerHTML src/ui/md.tsx  [auto-applied]
  ok [HIGH-001] Missing input validation src/api/users.ts:118  [auto-applied]
  ?  [MED-001]  Unsafe type coercion src/utils/parse.ts:7

    - const val = data as UserInput;
    + const val = UserInputSchema.parse(data);

    Apply this medium-confidence fix? [y/n/d/s] y
  ok [MED-001]  Applied

  x  [MED-003]  Hardcoded timeout -- fix produced syntax error, rolled back

Validating...
  ok Syntax check passed
  ok Type check passed (tsc --noEmit)
  !! Lint: 1 new warning in src/auth/login.ts:45
  ok Tests passed (42/42)

Committed to branch: surgeon/fix-1715270400
  2 commits: 2 security fixes, 1 reliability fix
  Applied: 8/14 fixable | Skipped: 3 | Failed: 1 | Rejected: 2

To review: git diff main...surgeon/fix-1715270400
To merge:  git checkout main && git merge surgeon/fix-1715270400
To discard: git checkout main && git branch -D surgeon/fix-1715270400
```

---

## 8. TUI (Interactive Review)

Built with Ink (React for terminals). Three views connected by keyboard navigation.

### List View (default)

```
+-- Surgeon Review ------------------------------------------------+
|                                                                   |
|  Health Score: 72/100          Findings: 18 total (6 shown)      |
|  Last Scan: 2026-05-09 15:30   Scope: Branch (vs main, 12 files)|
|                                                                   |
|  +- Filters ---------------------------------------------------+ |
|  | Severity: [*All  Crit  High  Med  Low]                      | |
|  | Mode:     [*All  Security  Perf  Reliability  Maint  Tests] | |
|  | Fixable:  [*All  Fixable only  Auto-fixable only]           | |
|  | Search:   [                                        ]        | |
|  +-------------------------------------------------------------+ |
|                                                                   |
|  [ ] * CRIT  src/auth/login.ts:42       SQL injection risk       |
|  [ ] * CRIT  src/api/admin.ts:15        Missing auth middleware  |
|  [x] * HIGH  src/api/users.ts:118       Missing input validation |
|  [ ] o MED   src/utils/parse.ts:7       Unsafe type coercion    |
|  [ ] o MED   src/db/queries.ts:55       N+1 query in loop       |
|  [ ] o LOW   src/config/db.ts:23        Hardcoded timeout        |
|                                                                   |
|  ---------------------------------------------------------------  |
|  Up/Dn Navigate  Space Toggle  Enter Details  / Search           |
|  Tab Cycle filters  a Select all  n None  x Execute  q Quit     |
+-------------------------------------------------------------------+
```

### Detail View (Enter on a finding)

Shows full context: description, evidence with line numbers, proposed fix diff, confidence, breaking risk, test suggestion, and references (CWEs, OWASP, docs).

### Summary View (before executing fixes)

Shows selected fixes grouped by approval mode (auto-apply vs. prompt), explains what will happen (branch creation, fix count, validation steps), and offers proceed/save/back options.

### Key Behaviors

- Keyboard-driven navigation (no mouse required)
- Filter by severity, mode, fixable status
- Fuzzy search across all finding fields
- Toggle individual findings for fix selection
- Selections saved to `.surgeon/selected-fixes.json`
- Can launch `srgn fix` directly from TUI

### Component Tree

```
App (root, view router)
  ListView
    FilterBar
    FindingRow (per finding)
    KeyHints
  DetailView
    CodeBlock (evidence)
    DiffView (proposed fix)
    KeyHints
  SummaryView
    KeyHints
```

---

## 9. Report Generation

### Three Output Formats

All generated from the same `ScanResult` data.

**JSON (`audit.json`):**
Full `ScanResult` object. Machine-readable. For CI/CD integration and external tooling.

**Markdown (`audit.md`):**
Human-readable report with:
- Project info, date, scope indicator
- Health score
- Summary table (severity counts)
- Each finding with file, evidence code block, suggestion
- Module health table
- Token usage and scan duration

**HTML (`audit.html`):**
Single self-contained file (inline CSS + JS, no external dependencies, works offline):
- Sortable/filterable findings table
- Severity distribution chart (CSS bars)
- Module health heatmap
- Code snippet viewer with syntax highlighting (Prism.js inlined)
- Click-to-expand fix diffs
- Search across all findings
- Scope indicator banner for branch scans
- Print-friendly (`@media print` styles)

### History

Previous scans saved to `surgeon-tests/history/<timestamp>.json` for trend tracking.

---

## 10. Project Structure

```
surgeon-ai/
  package.json
  tsconfig.json
  tsup.config.ts
  vitest.config.ts
  eslint.config.js
  .prettierrc
  LICENSE (MIT)
  README.md

  bin/
    srgn.ts                  # Entry point

  src/
    index.ts                 # Main exports (programmatic use)

    cli/
      index.ts               # Commander program definition
      commands/
        scan.ts              # srgn scan
        fix.ts               # srgn fix
        review.ts            # srgn review -> TUI
        report.ts            # srgn report
        init.ts              # srgn init
      flags.ts               # Shared flag definitions
      output.ts              # Terminal formatting helpers

    config/
      index.ts               # Load + merge config
      schema.ts              # Zod schema for config
      defaults.ts            # Default values

    git/
      index.ts               # Git helper facade
      branch.ts              # Branch operations
      diff.ts                # getChangedFiles(base)
      stash.ts               # Auto-stash/restore

    discovery/
      index.ts               # File discovery orchestrator
      walker.ts              # fast-glob based walker
      detector.ts            # Language/framework detection
      filters.ts             # Include/exclude/gitignore

    graph/
      index.ts               # Graph builder entry
      parser.ts              # Import/export regex parser
      resolver.ts            # Path resolution (tsconfig paths)
      builder.ts             # Adjacency list construction
      cycles.ts              # Cycle detection (DFS)
      clusterer.ts           # Module clustering

    bridge/
      index.ts               # Claude Bridge facade
      spawner.ts             # Spawn claude -p process
      pool.ts                # Concurrency pool (p-limit)
      parser.ts              # Parse Claude JSON responses
      retry.ts               # Retry logic

    profiles/
      index.ts               # Profile registry + auto-detection
      types.ts               # FrameworkProfile interface
      base.ts                # Universal audit rules
      node.ts                # Node.js core
      typescript.ts          # TypeScript-specific
      react.ts               # React
      nextjs.ts              # Next.js
      express.ts             # Express
      fastify.ts             # Fastify
      nestjs.ts              # NestJS
      testing.ts             # Test quality rules

    analyzer/
      index.ts               # Scan orchestrator (phases 1-5)
      prompt.ts              # Prompt assembly pipeline
      chunk-audit.ts         # Per-chunk audit logic
      cross-module.ts        # Cross-module pass
      dedup.ts               # Finding deduplication

    fixer/
      index.ts               # Fix orchestrator
      planner.ts             # Fix planning + ordering
      guard.ts               # Branch guard (safety)
      applier.ts             # Diff application
      validator.ts           # Post-fix validation
      committer.ts           # Commit grouping

    reporter/
      index.ts               # Report orchestrator
      json.ts                # JSON report
      markdown.ts            # Markdown report
      html/
        generator.ts         # HTML builder
        template.ts          # Base HTML template
        styles.ts            # Inlined CSS
        scripts.ts           # Inlined JS
        charts.ts            # CSS severity bars
        prism.ts             # Inlined Prism.js
      history.ts             # Scan history

    tui/
      App.tsx                # Root TUI component
      state.ts               # React context
      views/
        ListView.tsx         # Findings list
        DetailView.tsx       # Single finding detail
        SummaryView.tsx      # Pre-fix confirmation
      components/
        FilterBar.tsx        # Filter controls
        FindingRow.tsx       # List row
        CodeBlock.tsx        # Syntax-highlighted code
        DiffView.tsx         # Fix diff display
        HealthBar.tsx        # Visual health score
        SearchInput.tsx      # Fuzzy search
        KeyHints.tsx         # Keyboard shortcut bar
      hooks/
        useKeyboard.ts       # Navigation handler
        useFilter.ts         # Filter logic
        useScroll.ts         # Viewport scrolling

    types/
      finding.ts             # Finding, ProposedFix, FileDiff
      scan.ts                # ScanResult, ScanMeta, ScanSummary
      config.ts              # Config types
      graph.ts               # DepGraph, FileNode, Edge
      fix.ts                 # FixPlan, FixResult, BranchGuard

  tests/
    unit/
      graph/                 # Parser, resolver, cycles, clusterer
      bridge/                # Response parsing, pool
      fixer/                 # Planner, applier, guard
      profiles/              # Framework detection
      reporter/              # MD and JSON generation
      config/                # Config validation
    integration/
      scan.test.ts           # Full scan pipeline (mocked Claude)
      fix.test.ts            # Fix pipeline with real git
      branch-scan.test.ts    # Branch scan with real git
    fixtures/
      sample-project/        # Minimal project with deliberate bugs
      claude-responses/      # Mock Claude response fixtures
```

---

## 11. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Runtime | Node.js 20+ | Target ecosystem, native ESM |
| Language | TypeScript 5.x | Type safety, matches audience |
| Module system | ESM | Modern standard |
| Build | tsup | Fast, zero-config CLI bundler |
| CLI framework | Commander.js | Mature, lightweight, TS support |
| TUI framework | Ink 5 | React for terminals |
| Concurrency | p-limit | Simple pool for parallel Claude calls |
| Git operations | simple-git | Programmatic git |
| File walking | fast-glob | Fast, respects .gitignore |
| Spinner/progress | ora | Terminal spinners |
| Response validation | Zod | Schema validation for Claude responses |
| Testing | Vitest | Fast, ESM-native, TS-first |
| Linting | ESLint 9 | Flat config |
| Formatting | Prettier | Consistent style |
| Package manager | pnpm | Fast, strict |

### File Size Guidelines

| File type | Target max lines |
|-----------|-----------------|
| Component (TSX) | ~150 |
| Module (logic) | ~200 |
| Profile (prompts) | ~250 |
| Types file | ~100 |
| Test file | ~300 |

---

## 12. Future Roadmap (Post-MVP)

Not in scope for MVP, but the architecture supports:

- **Custom rule packs** — `.surgeon/rules/` YAML/JSON for user-defined audit rules
- **MCP server** — expose scan/fix/review as MCP tools for IDE integration
- **CI/CD mode** — `srgn ci` with exit codes, quality gates, GitHub Actions integration
- **HTML trend dashboard** — compare scans over time from `surgeon-tests/history/`
- **Direct Claude API** — swap `claude -p` for `@anthropic-ai/sdk` to remove CLI dependency
- **Additional framework profiles** — Django, FastAPI, Spring Boot, Rails
- **VS Code extension** — inline findings display, one-click fix
