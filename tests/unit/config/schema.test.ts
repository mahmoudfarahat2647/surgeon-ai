import { describe, it, expect } from "vitest";
import { configSchema, parseConfig } from "@/config/schema.js";
import { DEFAULT_CONFIG } from "@/config/defaults.js";

describe("configSchema", () => {
  it("validates a complete valid config", () => {
    const result = configSchema.safeParse(DEFAULT_CONFIG);
    expect(result.success).toBe(true);
  });

  it("rejects invalid depth value", () => {
    const result = configSchema.safeParse({ ...DEFAULT_CONFIG, depth: "extreme" });
    expect(result.success).toBe(false);
  });

  it("applies defaults for missing optional fields", () => {
    const result = parseConfig({});
    expect(result.base).toBe("main");
    expect(result.depth).toBe("standard");
    expect(result.output).toBe("surgeon-tests");
  });

  it("merges partial config with defaults", () => {
    const result = parseConfig({ base: "develop", depth: "deep" });
    expect(result.base).toBe("develop");
    expect(result.depth).toBe("deep");
    expect(result.output).toBe("surgeon-tests");
  });
});
