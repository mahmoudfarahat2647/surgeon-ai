# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## surgeon-ai: AI-Powered Codebase Audit & Repair CLI

A TypeScript/Node.js CLI tool (`srgn`) that scans codebases for security, performance, reliability, and maintainability issues using Claude AI, then applies automated fixes via isolated git branches.

## Quick Commands

```bash
# Development
pnpm install              # Install dependencies
pnpm run build            # Build to dist/
pnpm run dev              # Watch mode
pnpm test                 # Run tests in watch mode
pnpm test:run             # Run tests once
pnpm run lint             # Run ESLint
pnpm run format           # Format with Prettier
pnpm run typecheck        # Check types (tsc --noEmit)

# CLI
srgn init                 # Create .surgeon/config.json
srgn scan [path]          # Audit a codebase
srgn fix [path]           # Apply fixes on an isolated branch
srgn review               # Interactive TUI review of last scan
srgn report               # Regenerate reports
```

## Architecture

### 5-Phase Pipeline (`src/analyzer/`)

The `analyze()` function orchestrates a 5-phase scan:

1. **Discovery** (`src/discovery/`) — Detect frameworks (Express, React, etc.) and walk source files
2. **Dependency Graph** (`src/graph/`) — Parse imports, resolve aliases, detect cycles, cluster modules
3. **Framework Profiles** (`src/profiles/`) — Load framework-specific audit rules (base + 8 frameworks)
4. **Parallel Chunk Audit** (`src/bridge/`) — Spawn `claude -p` agents in parallel via agent pool, one per cluster
5. **Cross-Module Pass** — Detect issues spanning multiple modules after all chunks are audited

### Core Modules

- **`config/`** — Zod schema for `.surgeon/config.json`, load/merge defaults
- **`discovery/`** — Detect project type (PM, frameworks), walk files, apply filters
- **`graph/`** — Parse imports (ESM/CommonJS/require), resolve paths (relative, alias, index.ts), detect cycles, cluster by directory
- **`bridge/`** — Spawn Claude via `execFile("claude", ["-p", ...])`, parse JSON responses, retry with backoff, run agent pool with p-limit
- **`analyzer/`** — Build prompts, chunk files, orchestrate 5-phase pipeline, deduplicate findings
- **`fixer/`** — Plan fixes (ordered by severity, auto-approve logic), create isolated fix branches, apply & validate, commit grouped by mode
- **`reporter/`** — JSON, Markdown, HTML (dark theme) reports + scan history
- **`cli/`** — Commander.js with 5 commands: init, scan, fix, review, report
- **`tui/`** — Ink-based React TUI for interactive review (ListView, DetailView, SummaryView with full keyboard nav)

### Data Flow

```
Project → detect frameworks → walk files → build dep graph → cluster modules
         ↓
Framework profiles + prompts
         ↓
Claude agents (parallel: 1 per cluster) → findings
         ↓
Cross-module analysis → deduplicate → reports (JSON/Markdown/HTML)
         ↓
[User selects findings via TUI or auto-approve logic]
         ↓
Fixer: plan → create branch → apply fixes → validate → commit → report
```

## Key Patterns

### ESM Only
- All imports use `.js` extensions: `import { foo } from "./foo.js"`
- `package.json` has `"type": "module"`
- No `__dirname`; use `fileURLToPath(import.meta.url)` for file paths

### TypeScript
- Strict mode enabled in `tsconfig.json`
- `"ignoreDeprecations": "6.0"` for TS6 compatibility with `baseUrl` + `paths`
- ESM modules resolve `./foo.js` (not just `./foo`) for proper module semantics

### Zod v4
- Schema syntax: `z.record(z.string(), z.boolean())` (two args, not object-based)
- Use `parseConfig(raw: unknown): SurgeonConfig` to validate untrusted input

### Framework Profiles
- Each profile is an object with `detect(): boolean`, `promptFragments`, `pitfalls`
- `detectProfiles(project)` returns list of matching profiles based on package.json and framework detection
- Profiles are combined into prompts sent to Claude agents

### Dependency Graph
- Uses regex-based import/export parsing (no full AST)
- Resolves aliases (`@/*` → `./src/*`) via `tsconfig.json` or `package.json`
- Clusters modules by directory (max 2 levels deep)
- Detects cycles via DFS; reported in findings

### Agent Pool
- `runAgentPool(tasks, options?)` spawns agents in parallel via p-limit
- Each task: `{ id, label, run: () => Promise<T> }`
- Returns `AgentResult<T>[]` with status (success/failure) + data
- Handles retries + rate-limit backoff automatically

### Fixer / Branch Guard
- `BranchGuardImpl` creates fix branches; rolls back on error
- `applyFixes()` applies diffs file-by-file with snapshot/rollback
- `validate()` runs tsc, eslint, npm test on modified files
- Fixes grouped by mode (security, performance, etc.) for commit history

## Testing

- **Unit tests** (`tests/unit/`) — Vitest globals, alias @ → src/
- **Integration tests** (`tests/integration/`) — Full pipeline on fixture project
- **Fixtures** (`tests/fixtures/sample-project/`) — Mock project with intentional issues

Run specific test file:
```bash
pnpm vitest run tests/unit/graph/parser.test.ts
```

## Common Tasks

### Add a new CLI command
1. Create `src/cli/commands/mycommand.ts` exporting `myCommand(path, flags)`
2. Add to `src/cli/index.ts` createProgram() via `.command()`
3. Add flags to `src/cli/flags.ts` if needed

### Extend framework profiles
1. Create `src/profiles/myframework.ts`
2. Export profile object with `detect()`, `promptFragments`, `pitfalls`
3. Import and add to `FRAMEWORK_PROFILES` in `src/profiles/index.ts`

### Modify audit pipeline
- Edit `src/analyzer/index.ts` phases (currently 5)
- Prompt building in `src/analyzer/prompt.ts`
- Chunk auditing in `src/analyzer/chunk-audit.ts` (calls `spawnClaude`)

### Add reporter format
1. Create `src/reporter/myformat.ts` exporting `generate[Format](scanResult, outputDir)`
2. Call from `src/reporter/index.ts` in `generateReports()`

## Build & Distribution

- `tsup` compiles ESM to `dist/srgn.js` (CLI entry) + `dist/index.js` (library)
- `pnpm run build` generates `.d.ts` files for types
- Bin target: `dist/srgn.js` with shebang for CLI usage
- Exports: See `src/index.ts` for public API (analyze, generateReports, createProgram + types)

## Notes

- **Windows paths**: Use `path.posix` for cross-platform alias resolution when input is already Unix-style
- **Project detection**: Reads `package.json` + lock files (pnpm-lock.yaml, package-lock.json, yarn.lock) to detect frameworks and package manager
- **TUI state**: React Context + useReducer pattern; `Filters` apply to findings in reducer
- **Scan history**: Stored in `.surgeon/` directory for review/re-run across sessions
- **Git operations**: Use `simple-git` library; isolated branches prevent modifying main
- **Claude prompts**: Built with framework profile fragments + audit mode selection; responses parsed as JSON in markdown blocks
