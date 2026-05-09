import type { ModuleScan } from "../types/scan.js";
import type { Finding } from "../types/finding.js";
import { buildCrossModulePrompt } from "./prompt.js";
import { spawnClaude } from "../bridge/spawner.js";
import { parseClaudeResponse, type ClaudeAuditResponse } from "../bridge/parser.js";
import { withRetry } from "../bridge/retry.js";

export async function crossModulePass(
  projectPath: string,
  modules: ModuleScan[],
  existingFindings: Finding[],
  projectName: string,
): Promise<ClaudeAuditResponse> {
  const prompt = buildCrossModulePrompt(modules, existingFindings, projectName);

  return withRetry(async () => {
    const { stdout } = await spawnClaude({ prompt, cwd: projectPath });
    return parseClaudeResponse(stdout);
  });
}
