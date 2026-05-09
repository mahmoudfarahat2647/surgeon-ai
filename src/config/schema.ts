import { z } from "zod";
import { DEFAULT_CONFIG } from "./defaults.js";
import type { SurgeonConfig } from "../types/config.js";

export const configSchema = z.object({
  base: z.string().default(DEFAULT_CONFIG.base),
  depth: z.enum(["shallow", "standard", "deep"]).default(DEFAULT_CONFIG.depth),
  exclude: z.array(z.string()).default(DEFAULT_CONFIG.exclude),
  include: z.array(z.string()).default(DEFAULT_CONFIG.include),
  mode: z.string().default(DEFAULT_CONFIG.mode),
  output: z.string().default(DEFAULT_CONFIG.output),
  fix: z
    .object({
      autoApproveConfidence: z.enum(["high", "medium", "low"]).default("high"),
      branchPrefix: z.string().default("surgeon/fix"),
    })
    .default(DEFAULT_CONFIG.fix),
  profiles: z.record(z.string(), z.boolean()).default({}),
});

export function parseConfig(raw: unknown): SurgeonConfig {
  return configSchema.parse(raw ?? {});
}
