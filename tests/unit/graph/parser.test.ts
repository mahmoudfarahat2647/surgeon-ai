import { describe, it, expect } from "vitest";
import { parseImports, parseExports } from "@/graph/parser.js";

describe("parseImports", () => {
  it("parses ESM static imports", () => {
    const code = `import { foo } from "./utils";`;
    const result = parseImports(code);
    expect(result).toEqual([{ specifier: "./utils", type: "static", line: 1 }]);
  });

  it("parses dynamic imports", () => {
    const code = `const mod = await import("./lazy");`;
    const result = parseImports(code);
    expect(result).toEqual([{ specifier: "./lazy", type: "dynamic", line: 1 }]);
  });

  it("parses require calls", () => {
    const code = `const config = require("./config");`;
    const result = parseImports(code);
    expect(result).toEqual([{ specifier: "./config", type: "require", line: 1 }]);
  });

  it("parses re-exports", () => {
    const code = `export { helper } from "./helper";`;
    const result = parseImports(code);
    expect(result).toEqual([{ specifier: "./helper", type: "re-export", line: 1 }]);
  });

  it("parses type-only imports", () => {
    const code = `import type { User } from "./types";`;
    const result = parseImports(code);
    expect(result).toEqual([{ specifier: "./types", type: "static", line: 1 }]);
  });

  it("skips bare specifiers (npm packages)", () => {
    const code = `import express from "express";\nimport { foo } from "./local";`;
    const result = parseImports(code);
    expect(result).toHaveLength(1);
    expect(result[0].specifier).toBe("./local");
  });

  it("handles multiple imports in one file", () => {
    const code = `import { a } from "./a";\nimport { b } from "../b";\nconst c = require("./c");`;
    const result = parseImports(code);
    expect(result).toHaveLength(3);
  });
});

describe("parseExports", () => {
  it("parses named function export", () => {
    const code = `export function loginUser() {}`;
    const result = parseExports(code);
    expect(result[0].name).toBe("loginUser");
    expect(result[0].type).toBe("function");
  });

  it("parses default export", () => {
    const code = `export default class AuthService {}`;
    const result = parseExports(code);
    expect(result[0].name).toBe("AuthService");
    expect(result[0].type).toBe("class");
  });

  it("parses const export", () => {
    const code = `export const MAX_RETRIES = 3;`;
    const result = parseExports(code);
    expect(result[0].name).toBe("MAX_RETRIES");
    expect(result[0].type).toBe("variable");
  });
});
