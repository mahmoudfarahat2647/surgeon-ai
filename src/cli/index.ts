import { Command } from "commander";
import { branchFlag, baseFlag, modeFlag, depthFlag, formatFlag, outputFlag, autoFixFlag, yesFlag, confidenceFlag, includeFlag, excludeFlag, langFlag } from "./flags.js";
import { scanCommand } from "./commands/scan.js";
import { fixCommand } from "./commands/fix.js";
import { reviewCommand } from "./commands/review.js";
import { reportCommand } from "./commands/report.js";
import { initCommand } from "./commands/init.js";

export function createProgram(): Command {
  const program = new Command();

  program
    .name("srgn")
    .description("Surgeon AI — Codebase Audit & Repair CLI")
    .version("0.1.0");

  program
    .command("scan [path]")
    .description("Run comprehensive audit on a codebase")
    .addOption(branchFlag)
    .addOption(baseFlag)
    .addOption(modeFlag)
    .addOption(depthFlag)
    .addOption(formatFlag)
    .addOption(outputFlag)
    .addOption(autoFixFlag)
    .addOption(includeFlag)
    .addOption(excludeFlag)
    .addOption(langFlag)
    .action(scanCommand);

  program
    .command("fix [path]")
    .description("Apply fixes from last scan on isolated branch")
    .addOption(branchFlag)
    .addOption(baseFlag)
    .addOption(yesFlag)
    .addOption(confidenceFlag)
    .action(fixCommand);

  program
    .command("review")
    .description("Interactive TUI to browse and select findings")
    .action(reviewCommand);

  program
    .command("report")
    .description("Regenerate reports from last scan data")
    .addOption(formatFlag)
    .addOption(outputFlag)
    .action(reportCommand);

  program
    .command("init")
    .description("Create .surgeon/ config in project")
    .action(initCommand);

  return program;
}
