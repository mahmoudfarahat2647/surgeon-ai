import fs from "fs/promises";
import path from "path";
import type { ModuleCluster } from "../types/graph.js";
import type { FrameworkProfile, AuditMode } from "../profiles/types.js";
import type { ProjectInfo } from "../types/scan.js";
import { buildChunkPrompt } from "./prompt.js";
import { spawnClaude } from "../bridge/spawner.js";
import { parseClaudeResponse, type ClaudeAuditResponse } from "../bridge/parser.js";
import { withRetry } from "../bridge/retry.js";

export async function auditChunk(
  projectPath: string,
  chunk: ModuleCluster,
  profiles: FrameworkProfile[],
  mode: AuditMode,
  depth: "shallow" | "standard" | "deep",
  project: ProjectInfo,
): Promise<ClaudeAuditResponse> {
  const fileContents = new Map<string, string>();
  for (const file of chunk.files) {
    const content = await fs.readFile(path.resolve(projectPath, file.path), "utf-8");
    fileContents.set(file.path, content);
  }

  const prompt = buildChunkPrompt(chunk, profiles, mode, depth, fileContents, project);

  const result = await withRetry(async () => {
    const { stdout } = await spawnClaude({ prompt, cwd: projectPath });
    return parseClaudeResponse(stdout);
  });

  return result;
}
