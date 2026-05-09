import type { ExportInfo, EdgeType } from "../types/graph.js";

export interface ParsedImport {
  specifier: string;
  type: EdgeType;
  line: number;
}

function getLineNumber(content: string, index: number): number {
  return content.slice(0, index).split("\n").length;
}

function isBareSpecifier(specifier: string): boolean {
  return !specifier.startsWith(".") && !specifier.startsWith("/") && !specifier.startsWith("@/") && !specifier.startsWith("~/");
}

export function parseImports(content: string): ParsedImport[] {
  const imports: ParsedImport[] = [];

  const patterns: Array<{ regex: RegExp; type: EdgeType }> = [
    {
      regex: /import\s+(?:type\s+)?(?:(?:\{[^}]*\}|[\w*]+(?:\s*,\s*\{[^}]*\})?)\s+from\s+)?['"]([^'"]+)['"]/g,
      type: "static",
    },
    {
      regex: /import\(\s*['"]([^'"]+)['"]\s*\)/g,
      type: "dynamic",
    },
    {
      regex: /require\(\s*['"]([^'"]+)['"]\s*\)/g,
      type: "require",
    },
    {
      regex: /export\s+(?:\{[^}]*\}|\*)\s+from\s+['"]([^'"]+)['"]/g,
      type: "re-export",
    },
  ];

  for (const { regex, type } of patterns) {
    for (const match of content.matchAll(regex)) {
      const specifier = match[1];
      if (isBareSpecifier(specifier)) continue;
      imports.push({
        specifier,
        type,
        line: getLineNumber(content, match.index!),
      });
    }
  }

  return imports;
}

export function parseExports(content: string): ExportInfo[] {
  const exports: ExportInfo[] = [];

  const namedPattern =
    /export\s+(?:async\s+)?(function|class|const|let|var|enum|interface|type)\s+([\w]+)/g;
  for (const match of content.matchAll(namedPattern)) {
    const kind = match[1];
    const name = match[2];
    const typeMap: Record<string, ExportInfo["type"]> = {
      function: "function",
      class: "class",
      const: "variable",
      let: "variable",
      var: "variable",
      enum: "enum",
      interface: "interface",
      type: "type",
    };
    exports.push({
      name,
      type: typeMap[kind] ?? "variable",
      line: getLineNumber(content, match.index!),
    });
  }

  const defaultPattern = /export\s+default\s+(?:async\s+)?(?:function|class)\s*([\w]*)/g;
  for (const match of content.matchAll(defaultPattern)) {
    exports.push({
      name: match[1] || "default",
      type: match[0].includes("class") ? "class" : "function",
      line: getLineNumber(content, match.index!),
    });
  }

  return exports;
}
