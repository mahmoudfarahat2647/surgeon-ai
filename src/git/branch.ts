import simpleGit from "simple-git";

export async function getCurrentBranch(projectPath: string): Promise<string | null> {
  const git = simpleGit(projectPath);
  const branch = await git.branch();
  return branch.current || null;
}

export async function createFixBranch(
  projectPath: string,
  prefix: string,
): Promise<string> {
  const git = simpleGit(projectPath);
  const timestamp = Math.floor(Date.now() / 1000);
  let branchName = `${prefix}-${timestamp}`;

  const branches = await git.branch();
  let counter = 1;
  while (branches.all.includes(branchName)) {
    branchName = `${prefix}-${timestamp}-${counter}`;
    counter++;
  }

  await git.checkoutLocalBranch(branchName);
  return branchName;
}

export async function switchBranch(projectPath: string, branch: string): Promise<void> {
  const git = simpleGit(projectPath);
  await git.checkout(branch);
}

export async function deleteBranch(projectPath: string, branch: string): Promise<void> {
  const git = simpleGit(projectPath);
  await git.deleteLocalBranch(branch, true);
}
