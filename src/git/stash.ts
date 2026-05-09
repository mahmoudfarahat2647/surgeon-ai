import simpleGit from "simple-git";

export async function autoStash(projectPath: string): Promise<string | null> {
  const git = simpleGit(projectPath);
  const status = await git.status();

  if (status.files.length === 0) return null;

  await git.stash(["push", "-m", "surgeon: auto-stash before fix"]);
  return "surgeon-stash";
}

export async function restoreStash(projectPath: string): Promise<void> {
  const git = simpleGit(projectPath);
  try {
    await git.stash(["pop"]);
  } catch {
    // Stash may have already been applied or was empty
  }
}
