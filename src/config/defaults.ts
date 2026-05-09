import type { SurgeonConfig } from "../types/config.js";

export const DEFAULT_CONFIG: SurgeonConfig = {
  base: "main",
  depth: "standard",
  exclude: ["node_modules", "dist", ".next", "coverage", "*.min.js"],
  include: [],
  mode: "full",
  output: "surgeon-tests",
  fix: {
    autoApproveConfidence: "high",
    branchPrefix: "surgeon/fix",
  },
  profiles: {},
};
