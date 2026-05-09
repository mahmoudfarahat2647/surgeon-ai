import { describe, it, expect } from "vitest";
import { resolveImport, type ResolverConfig } from "@/graph/resolver.js";

describe("resolveImport", () => {
  const config: ResolverConfig = {
    aliases: { "@/": "src/" },
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    projectPath: "/project",
    fileExists: (p: string) => {
      const existing = new Set([
        "/project/src/utils.ts",
        "/project/src/auth/login.ts",
        "/project/src/components/index.tsx",
      ]);
      return existing.has(p);
    },
  };

  it("resolves relative import with extension probe", () => {
    const result = resolveImport("./utils", "/project/src/index.ts", config);
    expect(result).toBe("src/utils.ts");
  });

  it("resolves tsconfig path alias", () => {
    const result = resolveImport("@/auth/login", "/project/src/index.ts", config);
    expect(result).toBe("src/auth/login.ts");
  });

  it("resolves index file in directory", () => {
    const result = resolveImport("./components", "/project/src/index.ts", config);
    expect(result).toBe("src/components/index.tsx");
  });

  it("returns null for unresolvable import", () => {
    const result = resolveImport("./nonexistent", "/project/src/index.ts", config);
    expect(result).toBeNull();
  });
});
