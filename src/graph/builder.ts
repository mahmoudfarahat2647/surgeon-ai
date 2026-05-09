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
