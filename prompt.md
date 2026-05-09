You are a senior TypeScript CLI architect and AI tooling engineer.

I am building an open-source CLI tool called "Surgeon".

Surgeon is an AI-powered codebase audit and repair CLI.

Core concept:
Surgeon should work in two separate phases:

1. Scan phase:
   The CLI scans a codebase in one operation and generates a structured audit report.
   It must NOT modify files during scan.

2. Fix phase:
   After the user reviews the audit report, the CLI can fix selected issues.
   Fixing must be explicit, controlled, and reviewable.

The tool should not automatically fix everything without user intent.

CLI command:
surgeon

Main workflows:

1. Scan codebase:

surgeon scan ./my-project

This should:
- inspect the project
- run Claude Code in read-only mode
- generate a Markdown report
- generate a machine-readable JSON report
- assign each finding a stable issue ID
- save results to a `.surgeon/` folder

Example output files:
.surgeon/audit.md
.surgeon/audit.json

2. Review audit:

surgeon review

This should:
- read `.surgeon/audit.json`
- show issues in the terminal
- allow filtering by severity/category
- allow the user to inspect issue details

Example:

surgeon review
surgeon review --severity high
surgeon review --category security

3. Fix selected issue:

surgeon fix SGN-001

This should:
- read the selected issue from `.surgeon/audit.json`
- ask Claude Code to fix only that issue
- allow write tools only during this phase
- keep the fix scoped to the selected issue
- show a summary of changed files
- recommend tests to run

4. Fix multiple issues:

surgeon fix SGN-001 SGN-002 SGN-003

5. Fix all issues from a severity:

surgeon fix --severity high

This should still require confirmation before applying changes.

6. Dry run fix:

surgeon fix SGN-001 --dry-run

This should explain the intended fix but not modify files.

Important safety model:
- `surgeon scan` is always read-only.
- `surgeon fix` is the only command allowed to modify files.
- Fixes must be explicit.
- Auto-fix all issues should never happen by default.
- Secrets must never be read or included in reports.
- The tool should prefer narrow, minimal changes.
- The tool should not refactor unrelated code.
- The tool should not change formatting-only code unless required.
- The tool should not modify lock files unless dependency changes are explicitly required.

MVP commands:

surgeon scan <path>
surgeon review
surgeon fix <issueIds...>

MVP options:

For scan:
--output <dir>
--mode <full|security|performance|tests>
--max-files <number>
--include-tests
--json
--verbose
--dry-run

For review:
--severity <critical|high|medium|low>
--category <security|reliability|performance|maintainability|testing>

For fix:
--dry-run
--yes
--severity <critical|high|medium|low>
--category <security|reliability|performance|maintainability|testing>

Audit issue schema:
Each issue in `.surgeon/audit.json` should look like:

{
  "id": "SGN-001",
  "severity": "critical | high | medium | low",
  "category": "security | reliability | performance | maintainability | testing",
  "file": "path/to/file",
  "area": "function/component/module",
  "title": "short title",
  "problem": "what is wrong",
  "impact": "why it matters",
  "trigger": "how it can happen",
  "suggestedFix": "how to fix it",
  "suggestedTest": "test that should be added",
  "confidence": "high | medium | low",
  "status": "open | fixed | ignored"
}

Audit report folder:
Surgeon should create:

.surgeon/
  audit.md
  audit.json
  fixes/
    SGN-001.md
    SGN-002.md

Scan behavior:
- Run Claude Code in headless mode with `claude -p`.
- Use `--cwd` pointing to the target project.
- Use read-only tools:
  - Read
  - Grep
  - Glob
- Do not allow Edit, Write, MultiEdit, or Bash in scan mode unless absolutely necessary.
- The scan should generate both Markdown and JSON output.
- If Claude output is not valid JSON, Surgeon should handle that gracefully and explain the problem.

Fix behavior:
- Run Claude Code with a focused prompt for the selected issue only.
- Use the audited project path from metadata saved in `.surgeon/audit.json`.
- Allow write tools only for fix mode:
  - Read
  - Grep
  - Glob
  - Edit
  - MultiEdit
- Avoid Bash by default in MVP.
- If Bash is later added, it should be optional and restricted.
- After fixing, write a fix summary to `.surgeon/fixes/<issue-id>.md`.
- Mark the issue as fixed in `.surgeon/audit.json` only after Claude reports the fix completed.
- If `--dry-run` is passed, do not allow write tools.

Fix prompt rules:
When fixing an issue, Claude must:
- Fix only the selected issue.
- Avoid unrelated refactors.
- Avoid broad rewrites.
- Avoid touching secrets.
- Explain changed files.
- Explain why the fix resolves the issue.
- Suggest tests.
- Mention if it could not safely fix the issue.

Preferred stack:
- Node.js 18+
- TypeScript
- commander
- execa
- ora
- picocolors
- zod
- fs-extra

Suggested architecture:

src/
  index.ts
  cli.ts
  commands/
    scan.ts
    review.ts
    fix.ts
  claude/
    runClaude.ts
    prompts.ts
  surgeon/
    auditStore.ts
    issueIds.ts
    reportWriter.ts
    filters.ts
  filesystem/
    paths.ts
    ignores.ts
  types.ts
  errors.ts

Implementation requirements:
- Build the plan first.
- Do not write code immediately.
- Design the commands clearly.
- Explain how scan and fix are separated.
- Explain how issue IDs are generated.
- Explain how `.surgeon/audit.json` is used as the source of truth.
- Explain the security model.
- Explain how Claude Code auth is handled.
- Explain the exact Claude Code commands used for scan and fix.
- Explain how dry-run works.
- Explain the testing strategy.

After the plan, ask me to confirm before implementation.