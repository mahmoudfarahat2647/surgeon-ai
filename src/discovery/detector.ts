import fs from "fs/promises";
import path from "path";
import type { ProjectInfo, PackageManager, NextjsRouter } from "../types/scan.js";

const FRAMEWORK_DEPS: Record<string, string> = {
  next: "next",
  react: "react",
  express: "express",
  fastify: "fastify",
  "@nestjs/core": "nestjs",
};

export function detectFromPackageJson(
  pkg: { name?: string; dependencies?: Record<string, string>; devDependencies?: Record<string, string> },
  lockfileName?: string,
): { frameworks: string[]; packageManager: PackageManager } {
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  const frameworks: string[] = [];

  for (const [dep, frameworkId] of Object.entries(FRAMEWORK_DEPS)) {
    if (allDeps[dep]) {
      frameworks.push(frameworkId);
    }
  }

  let packageManager: PackageManager = "npm";
  if (lockfileName) {
    if (lockfileName.includes("pnpm")) packageManager = "pnpm";
    else if (lockfileName.includes("yarn")) packageManager = "yarn";
    else if (lockfileName.includes("bun")) packageManager = "bun";
  }

  return { frameworks, packageManager };
}

async function dirExists(p: string): Promise<boolean> {
  try {
    const stat = await fs.stat(p);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

export async function detectProject(projectPath: string): Promise<ProjectInfo> {
  let pkg: Record<string, unknown> = {};
  let lockfileName: string | undefined;

  try {
    const raw = await fs.readFile(path.join(projectPath, "package.json"), "utf-8");
    pkg = JSON.parse(raw);
  } catch {
    // No package.json
  }

  const lockfiles = ["pnpm-lock.yaml", "yarn.lock", "bun.lockb", "package-lock.json"];
  for (const lf of lockfiles) {
    try {
      await fs.access(path.join(projectPath, lf));
      lockfileName = lf;
      break;
    } catch {
      // Not found
    }
  }

  const { frameworks, packageManager } = detectFromPackageJson(pkg as Record<string, unknown>, lockfileName);

  // Detect Next.js router convention
  let nextjsRouter: NextjsRouter | undefined;
  if (frameworks.includes("next")) {
    const hasApp = await dirExists(path.join(projectPath, "app"))
                || await dirExists(path.join(projectPath, "src", "app"));
    const hasPages = await dirExists(path.join(projectPath, "pages"))
                  || await dirExists(path.join(projectPath, "src", "pages"));
    if (hasApp && hasPages) nextjsRouter = "both";
    else if (hasApp) nextjsRouter = "app";
    else if (hasPages) nextjsRouter = "pages";
  }

  const languages: string[] = [];
  try {
    await fs.access(path.join(projectPath, "tsconfig.json"));
    languages.push("typescript");
  } catch {
    // No tsconfig
  }
  languages.push("javascript");

  return {
    name: (pkg.name as string) ?? path.basename(projectPath),
    languages,
    frameworks,
    packageManager,
    totalFiles: 0,
    scannedFiles: 0,
    nextjsRouter,
  };
}
