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
