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
