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
