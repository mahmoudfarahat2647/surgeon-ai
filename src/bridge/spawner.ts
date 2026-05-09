import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface SpawnOptions {
  prompt: string;
  cwd?: string;
  timeoutMs?: number;
}

export interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function spawnClaude(options: SpawnOptions): Promise<SpawnResult> {
  const args = ["-p", options.prompt, "--output-format", "json"];

  try {
    const { stdout, stderr } = await execFileAsync("claude", args, {
      cwd: options.cwd,
      timeout: options.timeoutMs ?? 300_000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? String(err),
      exitCode: e.code ?? 1,
    };
  }
}
