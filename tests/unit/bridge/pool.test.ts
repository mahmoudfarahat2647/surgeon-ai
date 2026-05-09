import { describe, it, expect } from "vitest";
import { runAgentPool, type AgentTask } from "@/bridge/pool.js";

describe("runAgentPool", () => {
  it("runs all tasks and returns results", async () => {
    const tasks: AgentTask<number>[] = [
      { id: "1", label: "task-a", run: async () => 10 },
      { id: "2", label: "task-b", run: async () => 20 },
      { id: "3", label: "task-c", run: async () => 30 },
    ];
    const results = await runAgentPool(tasks);
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.result).sort()).toEqual([10, 20, 30]);
  });

  it("captures errors without crashing other tasks", async () => {
    const tasks: AgentTask<number>[] = [
      { id: "1", label: "ok", run: async () => 42 },
      { id: "2", label: "fail", run: async () => { throw new Error("boom"); } },
    ];
    const results = await runAgentPool(tasks);
    expect(results).toHaveLength(2);
    const ok = results.find((r) => r.id === "1")!;
    const fail = results.find((r) => r.id === "2")!;
    expect(ok.result).toBe(42);
    expect(fail.error?.message).toBe("boom");
  });

  it("reports progress", async () => {
    const progressUpdates: number[] = [];
    const tasks: AgentTask<number>[] = [
      { id: "1", label: "a", run: async () => 1 },
      { id: "2", label: "b", run: async () => 2 },
    ];
    await runAgentPool(tasks, {
      onProgress: (p) => progressUpdates.push(p.completed),
    });
    expect(progressUpdates.length).toBeGreaterThan(0);
  });
});
