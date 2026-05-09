import type { FileNode, ModuleCluster } from "../types/graph.js";

export function clusterByDirectory(
  nodes: FileNode[],
  maxDepth = 2,
): ModuleCluster[] {
  const groups = new Map<string, FileNode[]>();

  for (const node of nodes) {
    const parts = node.path.split("/");
    const dirParts = parts.slice(0, Math.min(parts.length - 1, maxDepth));
    const dir = dirParts.length > 0 ? dirParts.join("/") : ".";

    if (!groups.has(dir)) groups.set(dir, []);
    groups.get(dir)!.push(node);
  }

  const clusters: ModuleCluster[] = [];
  let order = 0;

  for (const [dir, files] of groups) {
    // Split large clusters
    if (files.length > 20) {
      const subGroups = new Map<string, FileNode[]>();
      for (const file of files) {
        const parts = file.path.split("/");
        const subDir = parts.slice(0, Math.min(parts.length - 1, maxDepth + 1)).join("/");
        if (!subGroups.has(subDir)) subGroups.set(subDir, []);
        subGroups.get(subDir)!.push(file);
      }
      for (const [subDir, subFiles] of subGroups) {
        clusters.push({
          id: subDir,
          files: subFiles,
          internalEdges: [],
          externalImports: [],
          externalExports: [],
          scanOrder: order++,
        });
      }
    } else {
      clusters.push({
        id: dir,
        files,
        internalEdges: [],
        externalImports: [],
        externalExports: [],
        scanOrder: order++,
      });
    }
  }

  return clusters;
}
