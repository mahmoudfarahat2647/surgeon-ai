import { describe, it, expect } from "vitest";
import path from "path";
import { fileURLToPath } from "url";
import { detectProject } from "@/discovery/detector.js";
import { walkFiles } from "@/discovery/walker.js";
import { buildDepGraph } from "@/graph/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.resolve(__dirname, "../fixtures/sample-project");

describe("scan integration", () => {
  it("discovers project and detects Express", async () => {
    const project = await detectProject(FIXTURE_PATH);
    expect(project.frameworks).toContain("express");
    expect(project.name).toBe("sample-project");
  });

  it("walks source files excluding node_modules", async () => {
    const files = await walkFiles(FIXTURE_PATH, [], []);
    expect(files.length).toBeGreaterThan(0);
    expect(files.every((f) => !f.includes("node_modules"))).toBe(true);
  });

  it("builds dependency graph with imports", async () => {
    const files = await walkFiles(FIXTURE_PATH, [], []);
    const { graph, clusters } = await buildDepGraph(FIXTURE_PATH, files);
    expect(graph.nodes.size).toBeGreaterThan(0);
    expect(clusters.length).toBeGreaterThan(0);
  });
});
