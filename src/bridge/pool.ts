import pLimit from "p-limit";

export interface AgentTask<T> {
  id: string;
  label: string;
  run: () => Promise<T>;
}

export interface AgentResult<T> {
  id: string;
  label: string;
  result?: T;
  error?: Error;
  durationMs: number;
}

export interface PoolProgress {
  total: number;
  completed: number;
  active: string[];
  failed: string[];
}

export type ProgressCallback = (progress: PoolProgress) => void;

export async function runAgentPool<T>(
  tasks: AgentTask<T>[],
  options?: { onProgress?: ProgressCallback },
): Promise<AgentResult<T>[]> {
  // Orchestrator-driven: 1 agent per task, no artificial cap
  const limit = pLimit(tasks.length || 1);
  const results: AgentResult<T>[] = [];
  const active = new Set<string>();
  const failed = new Set<string>();
  let completed = 0;

  function reportProgress(): void {
    options?.onProgress?.({
      total: tasks.length,
      completed,
      active: [...active],
      failed: [...failed],
    });
  }

  const promises = tasks.map((task) =>
    limit(async () => {
      active.add(task.label);
      reportProgress();
      const start = Date.now();

      try {
        const result = await task.run();
        active.delete(task.label);
        completed++;
        reportProgress();
        const agentResult: AgentResult<T> = {
          id: task.id,
          label: task.label,
          result,
          durationMs: Date.now() - start,
        };
        results.push(agentResult);
        return agentResult;
      } catch (err) {
        active.delete(task.label);
        failed.add(task.label);
        completed++;
        reportProgress();
        const agentResult: AgentResult<T> = {
          id: task.id,
          label: task.label,
          error: err instanceof Error ? err : new Error(String(err)),
          durationMs: Date.now() - start,
        };
        results.push(agentResult);
        return agentResult;
      }
    }),
  );

  await Promise.all(promises);
  return results;
}
