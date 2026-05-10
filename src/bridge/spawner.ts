import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

interface ClaudeEnvelope {
  type: string;
  subtype?: string;
  is_error?: boolean;
  result?: string;
  total_cost_usd?: number;
}

export interface SpawnOptions {
  prompt: string;
  cwd?: string;
  timeoutMs?: number;
}

export interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  costUsd?: number;
}

/**
 * Claude CLI with --output-format json wraps its response in an envelope:
 *   { type: "result", result: "<actual text>", total_cost_usd: 0.001, ... }
 *
 * We unwrap it so callers always receive the raw Claude text in `stdout`.
 * If the stdout isn't an envelope (e.g. --output-format text fallback), we
 * return it unchanged.
 */
function unwrapEnvelope(raw: string): { text: string; costUsd?: number } {
  try {
    const obj = JSON.parse(raw) as ClaudeEnvelope;
    if (obj.type === "result" && typeof obj.result === "string") {
      return { text: obj.result, costUsd: obj.total_cost_usd };
    }
  } catch {
    // Not a JSON envelope — pass through as raw text
  }
  return { text: raw };
}

export async function spawnClaude(options: SpawnOptions): Promise<SpawnResult> {
  const args = [
    "-p",
    options.prompt,
    "--output-format",
    "json",
    "--dangerouslySkipPermissions",
  ];

  try {
    const { stdout, stderr } = await execFileAsync("claude", args, {
      cwd: options.cwd,
      timeout: options.timeoutMs ?? 300_000,
      maxBuffer: 10 * 1024 * 1024,
    });
    const { text, costUsd } = unwrapEnvelope(stdout);
    return { stdout: text, stderr, exitCode: 0, costUsd };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    const raw = e.stdout ?? "";
    const { text, costUsd } = unwrapEnvelope(raw);
    return {
      stdout: text,
      stderr: e.stderr ?? String(err),
      exitCode: e.code ?? 1,
      costUsd,
    };
  }
}
