export function getStyles(): string {
  return `
body { font-family: system-ui, sans-serif; margin: 0; padding: 0; background: #0d1117; color: #c9d1d9; }
header { background: #161b22; padding: 1rem 2rem; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center; }
h1 { margin: 0; font-size: 1.5rem; color: #58a6ff; }
.meta { display: flex; gap: 1rem; align-items: center; }
.badge { padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.85rem; font-weight: 600; }
.badge.full { background: #1f6feb; color: #fff; }
.badge.branch { background: #388bfd; color: #fff; }
section { padding: 1.5rem 2rem; }
.toolbar { display: flex; gap: 1rem; margin-bottom: 1rem; }
input, select { background: #161b22; color: #c9d1d9; border: 1px solid #30363d; padding: 0.5rem; border-radius: 6px; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 0.6rem 1rem; text-align: left; border-bottom: 1px solid #21262d; }
th { background: #161b22; font-weight: 600; cursor: pointer; }
.sev-critical { color: #f85149; font-weight: 700; }
.sev-high { color: #ff7b72; }
.sev-medium { color: #e3b341; }
.sev-low { color: #79c0ff; }
.sev-info { color: #8b949e; }
.hidden { display: none; }
.detail-row td { background: #0d1117; padding: 1rem; }
pre { background: #161b22; padding: 1rem; border-radius: 6px; overflow-x: auto; white-space: pre-wrap; }
.diff { font-family: monospace; }
.bar-container { display: flex; gap: 0.5rem; align-items: center; margin: 0.25rem 0; }
.bar { height: 16px; border-radius: 3px; min-width: 2px; }
.bar.critical { background: #f85149; }
.bar.high { background: #ff7b72; }
.bar.medium { background: #e3b341; }
.bar.low { background: #79c0ff; }
.bar.info { background: #8b949e; }
.module-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
.module-card { background: #161b22; border-radius: 8px; padding: 1rem; border: 1px solid #30363d; }
footer { text-align: center; padding: 1rem; color: #8b949e; border-top: 1px solid #21262d; }
`;
}
