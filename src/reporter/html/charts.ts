import type { ModuleScan } from "../../types/scan.js";

export function buildSeverityBars(bySeverity: Record<string, number>): string {
  const order = ["critical", "high", "medium", "low", "info"];
  const max = Math.max(...Object.values(bySeverity), 1);
  return order
    .filter((s) => bySeverity[s] > 0)
    .map((s) => {
      const count = bySeverity[s] ?? 0;
      const width = Math.round((count / max) * 200);
      return `<div class="bar-container"><span style="width:80px">${s}</span><div class="bar ${s}" style="width:${width}px"></div><span>${count}</span></div>`;
    })
    .join("\n");
}

export function buildModuleHeatmap(modules: ModuleScan[]): string {
  if (modules.length === 0) return "<p>No modules scanned.</p>";
  return `<div class="module-grid">${modules.map((m) => {
    const color = m.healthScore >= 80 ? "#238636" : m.healthScore >= 60 ? "#9e6a03" : "#b91c1c";
    return `<div class="module-card" style="border-color:${color}"><strong>${m.path}</strong><br>${m.healthScore}/100 health<br>${m.findings.length} finding(s)</div>`;
  }).join("")}</div>`;
}
