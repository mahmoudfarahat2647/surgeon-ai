# Surgeon AI

AI-Powered Codebase Audit & Repair CLI.

Surgeon AI (`srgn`) scans your codebase for security vulnerabilities, performance bottlenecks, reliability issues, and maintainability debt using Claude AI. It doesn't just find problems; it can also apply automated fixes via isolated git branches.

## Features

- **5-Phase Audit Pipeline**: Discovery, Dependency Graph, Framework Profiles, Parallel Chunk Audit, and Cross-Module Analysis.
- **Framework Aware**: Specialized audit rules for Express, React, Next.js, Vue, NestJS, Fastify, Svelte, and Angular.
- **Interactive TUI**: Browse and select findings via a keyboard-friendly terminal UI built with Ink.
- **Safe Fixes**: Applies fixes on isolated branches with automated validation (tsc, eslint, tests).
- **Comprehensive Reports**: Generates JSON, Markdown, and HTML reports.

## Installation

```bash
# Install globally via npm
npm install -g surgeon-ai

# Or run directly via npx
npx surgeon-ai scan
```

## Quick Start

1. **Initialize** Surgeon in your project:
   ```bash
   srgn init
   ```

2. **Scan** your codebase:
   ```bash
   srgn scan
   ```

3. **Review** findings interactively:
   ```bash
   srgn review
   ```

4. **Fix** issues automatically:
   ```bash
   srgn fix --yes
   ```

## Commands

- `srgn init`: Create a `.surgeon/config.json` in your project.
- `srgn scan [path]`: Run a comprehensive audit.
- `srgn fix [path]`: Apply fixes from the last scan on an isolated branch.
- `srgn review`: Interactive TUI to browse and select findings.
- `srgn report`: Regenerate reports from the last scan data.

## License

MIT
