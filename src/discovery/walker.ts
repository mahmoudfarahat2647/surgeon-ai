import fg from "fast-glob";

const SOURCE_EXTENSIONS = ["ts", "tsx", "js", "jsx", "mjs", "cjs"];

export async function walkFiles(
  projectPath: string,
  include: string[],
  exclude: string[],
): Promise<string[]> {
  const patterns =
    include.length > 0
      ? include
      : SOURCE_EXTENSIONS.map((ext) => `**/*.${ext}`);

  const ignorePatterns = [
    "**/node_modules/**",
    "**/dist/**",
    "**/.next/**",
    "**/coverage/**",
    "**/*.min.js",
    ...exclude,
  ];

  const files = await fg(patterns, {
    cwd: projectPath,
    ignore: ignorePatterns,
    absolute: false,
    dot: false,
  });

  return files.sort();
}
