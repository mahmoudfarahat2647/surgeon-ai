export type SourceLanguage = "ts" | "tsx" | "js" | "jsx" | "mjs" | "cjs";
export type EdgeType = "static" | "dynamic" | "require" | "re-export";

export interface ExportInfo {
  name: string;
  type: "function" | "class" | "variable" | "type" | "interface" | "enum";
  line: number;
}

export interface FileNode {
  path: string;
  imports: string[];
  importedBy: string[];
  exports: ExportInfo[];
  moduleId: string;
  depth: number;
  size: number;
  language: SourceLanguage;
}

export interface Edge {
  from: string;
  to: string;
  type: EdgeType;
  specifiers: string[];
}

export interface DepGraph {
  nodes: Map<string, FileNode>;
  edges: Edge[];
  entryPoints: string[];
  leafNodes: string[];
  cycles: string[][];
}

export interface ModuleCluster {
  id: string;
  files: FileNode[];
  internalEdges: Edge[];
  externalImports: Edge[];
  externalExports: ExportInfo[];
  scanOrder: number;
}
