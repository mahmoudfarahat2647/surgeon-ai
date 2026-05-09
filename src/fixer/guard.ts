import { getCurrentBranch, createFixBranch, switchBranch, deleteBranch } from "../git/branch.js";
import { autoStash, restoreStash } from "../git/stash.js";
import type { BranchGuard } from "../types/fix.js";

export class BranchGuardImpl implements BranchGuard {
  originalBranch = "";
  fixBranch = "";
  createdAt = "";
  stashId?: string;

  constructor(private projectPath: string, private branchPrefix: string) {}

  async create(): Promise<void> {
    const stashResult = await autoStash(this.projectPath);
    this.stashId = stashResult ?? undefined;
    this.originalBranch = (await getCurrentBranch(this.projectPath)) ?? "main";
    this.fixBranch = await createFixBranch(this.projectPath, this.branchPrefix);
    this.createdAt = new Date().toISOString();
  }

  async rollback(): Promise<void> {
    await switchBranch(this.projectPath, this.originalBranch);
    await deleteBranch(this.projectPath, this.fixBranch);
    if (this.stashId) {
      await restoreStash(this.projectPath);
    }
  }

  async complete(): Promise<void> {
    if (this.stashId) {
      await switchBranch(this.projectPath, this.originalBranch);
      await restoreStash(this.projectPath);
      await switchBranch(this.projectPath, this.fixBranch);
    }
  }
}
