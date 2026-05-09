import path from "path";

export interface ResolverConfig {
  aliases: Record<string, string>;
  extensions: string[];
  projectPath: string;
  fileExists: (absolutePath: string) => boolean;
}

/**
 * Normalize a path to use forward slashes consistently.
 * This ensures cross-platform compatibility when paths are used as keys.
 */
function normalizePath(p: string): string {
  return p.replace(/\\/g, "/");
}

/**
 * Resolve a path using forward-slash semantics regardless of platform.
 * Uses path.posix for consistent behavior when inputs use Unix-style separators.
 */
function resolvePath(base: string, relative: string): string {
  // If base is a Unix-style absolute path (starts with /), use posix resolution
  if (base.startsWith("/")) {
    return path.posix.resolve(path.posix.dirname(base), relative);
  }
  // Otherwise normalize to forward slashes and use posix
  const normalized = normalizePath(path.resolve(path.dirname(base), relative));
  return normalized;
}

function resolveFromRoot(projectPath: string, relative: string): string {
  if (projectPath.startsWith("/")) {
    return path.posix.resolve(projectPath, relative);
  }
  return normalizePath(path.resolve(projectPath, relative));
}

function getRelative(projectPath: string, absolutePath: string): string {
  if (projectPath.startsWith("/")) {
    return path.posix.relative(projectPath, absolutePath);
  }
  return normalizePath(path.relative(projectPath, absolutePath));
}

export function resolveImport(
  specifier: string,
  fromFile: string,
  config: ResolverConfig,
): string | null {
  let resolved = specifier;

  // Apply aliases
  for (const [prefix, replacement] of Object.entries(config.aliases)) {
    if (resolved.startsWith(prefix)) {
      resolved = resolved.replace(prefix, replacement);
      break;
    }
  }

  // Resolve to absolute path
  let basePath: string;
  if (resolved.startsWith(".")) {
    basePath = resolvePath(fromFile, resolved);
  } else {
    basePath = resolveFromRoot(config.projectPath, resolved);
  }

  // Try direct match with extensions
  for (const ext of config.extensions) {
    const candidate = basePath + ext;
    if (config.fileExists(candidate)) {
      return getRelative(config.projectPath, candidate);
    }
  }

  // Try index files
  for (const ext of config.extensions) {
    const candidate = basePath + "/index" + ext;
    if (config.fileExists(candidate)) {
      return getRelative(config.projectPath, candidate);
    }
  }

  return null;
}

export async function loadResolverConfig(projectPath: string): Promise<{
  aliases: Record<string, string>;
}> {
  const fs = await import("fs/promises");
  const aliases: Record<string, string> = {};

  try {
    const raw = await fs.readFile(path.join(projectPath, "tsconfig.json"), "utf-8");
    // Strip comments for JSON parsing
    const cleaned = raw.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    const tsconfig = JSON.parse(cleaned);
    const paths = tsconfig?.compilerOptions?.paths ?? {};
    const baseUrl = tsconfig?.compilerOptions?.baseUrl ?? ".";

    for (const [alias, targets] of Object.entries(paths)) {
      if (Array.isArray(targets) && targets.length > 0) {
        const cleanAlias = alias.replace("/*", "/");
        const cleanTarget = (targets[0] as string).replace("/*", "/");
        aliases[cleanAlias] = path.join(baseUrl, cleanTarget);
      }
    }
  } catch {
    // No tsconfig or parse error
  }

  return { aliases };
}
