import { describe, it, expect } from "vitest";
import { clusterByDirectory } from "@/graph/clusterer.js";
import type { FileNode } from "@/types/graph.js";

function makeNode(filePath: string): FileNode {
  return {
    path: filePath,
    imports: [],
    importedBy: [],
    exports: [],
    moduleId: "",
    depth: 0,
    size: 100,
    language: "ts",
  };
}

describe("clusterByDirectory", () => {
  it("groups files by parent directory", () => {
    const nodes = [
      makeNode("src/auth/login.ts"),
      makeNode("src/auth/register.ts"),
      makeNode("src/api/users.ts"),
    ];
    const clusters = clusterByDirectory(nodes);
    expect(clusters).toHaveLength(2);
    const authCluster = clusters.find((c) => c.id === "src/auth");
    expect(authCluster?.files).toHaveLength(2);
  });

  it("handles root-level files", () => {
    const nodes = [makeNode("index.ts"), makeNode("config.ts")];
    const clusters = clusterByDirectory(nodes);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].files).toHaveLength(2);
  });
});
