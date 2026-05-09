export function filterByLanguage(files: string[], lang?: string): string[] {
  if (!lang) return files;

  const extMap: Record<string, string[]> = {
    ts: [".ts", ".tsx"],
    js: [".js", ".jsx", ".mjs", ".cjs"],
    py: [".py"],
  };

  const exts = extMap[lang];
  if (!exts) return files;
  return files.filter((f) => exts.some((ext) => f.endsWith(ext)));
}

export function filterByChangedFiles(files: string[], changedFiles: string[]): string[] {
  const changed = new Set(changedFiles);
  return files.filter((f) => changed.has(f));
}
