import chalk from "chalk";

export function printBanner(): void {
  console.log(chalk.bold("\n  Surgeon AI — Codebase Audit & Repair\n"));
}

export function printScanSummary(summary: { totalFindings: number; bySeverity: Record<string, number>; healthScore: number; fixable: number; autoFixable: number }): void {
  console.log(chalk.bold(`\n  Health Score: ${summary.healthScore}/100\n`));
  for (const [sev, count] of Object.entries(summary.bySeverity)) {
    const color = sev === "critical" || sev === "high" ? chalk.red : sev === "medium" ? chalk.yellow : chalk.gray;
    const bar = "#".repeat(Math.min(count, 30));
    console.log(`  ${color(`${sev.padEnd(10)} ${String(count).padStart(3)}  ${bar}`)}`);
  }
  console.log(`\n  Fixable: ${summary.fixable}/${summary.totalFindings} (${summary.autoFixable} auto-fixable)\n`);
}

export function printError(message: string): void {
  console.error(chalk.red(`\n  Error: ${message}\n`));
}

export function printSuccess(message: string): void {
  console.log(chalk.green(`  ${message}`));
}

export function printInfo(message: string): void {
  console.log(chalk.gray(`  ${message}`));
}
