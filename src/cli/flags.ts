import { Option } from "commander";

export const branchFlag = new Option("-b, --branch", "Scope to current branch changes only");
export const baseFlag = new Option("--base <branch>", "Base branch for -b comparison").default("main");
export const modeFlag = new Option("--mode <mode>", "Audit mode").choices(["full", "security", "performance", "tests", "reliability", "maintainability"]).default("full");
export const depthFlag = new Option("--depth <depth>", "Analysis depth").choices(["shallow", "standard", "deep"]).default("standard");
export const formatFlag = new Option("--format <format>", "Output format").choices(["json", "md", "html", "all"]).default("all");
export const outputFlag = new Option("--output <dir>", "Report output directory").default("surgeon-tests");
export const autoFixFlag = new Option("--auto-fix", "Scan then auto-fix high confidence issues");
export const yesFlag = new Option("--yes", "Auto-approve high-confidence fixes");
export const confidenceFlag = new Option("--confidence <level>", "Minimum confidence for auto-approve").choices(["high", "medium", "low"]).default("high");
export const includeFlag = new Option("--include <glob>", "Only scan matching paths");
export const excludeFlag = new Option("--exclude <glob>", "Skip matching paths");
export const langFlag = new Option("--lang <lang>", "Override language detection");
