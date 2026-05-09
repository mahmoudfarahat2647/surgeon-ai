import fs from "fs/promises";
import path from "path";
import { parseConfig } from "./schema.js";
import type { SurgeonConfig } from "../types/config.js";

export { parseConfig } from "./schema.js";
export { DEFAULT_CONFIG } from "./defaults.js";

export async function loadConfig(projectPath: string): Promise<SurgeonConfig> {
  const configPath = path.join(projectPath, ".surgeon", "config.json");
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    return parseConfig(JSON.parse(raw));
  } catch {
    return parseConfig({});
  }
}

export function mergeCliFlags(
  config: SurgeonConfig,
  flags: Partial<SurgeonConfig>,
): SurgeonConfig {
  return {
    ...config,
    ...Object.fromEntries(Object.entries(flags).filter(([_, v]) => v !== undefined)), // eslint-disable-line @typescript-eslint/no-unused-vars
    fix: { ...config.fix, ...flags.fix },
  };
}
