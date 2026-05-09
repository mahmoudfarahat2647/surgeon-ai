import simpleGit from "simple-git";

export async function getChangedFiles(
  projectPath: string,
  baseBranch: string,
): Promise<string[]> {
  const git = simpleGit(projectPath);
  const result = await git.diff(["--name-only", baseBranch]);
  return result
    .split("\n")
    .map((f) => f.trim())
    .filter((f) => f.length > 0);
}

export async function getBaseBranch(projectPath: string): Promise<string> {
  const git = simpleGit(projectPath);
  const branches = await git.branch();
  if (branches.all.includes("main")) return "main";
  if (branches.all.includes("master")) return "master";
  return branches.all[0] ?? "main";
}
