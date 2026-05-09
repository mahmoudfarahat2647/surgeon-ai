import { execFile } from "child_process";
import { promisify } from "util";
import type { ValidationReport } from "../types/fix.js";

const exec = promisify(execFile);

async function tryExec(cmd: string, args: string[], cwd: string): Promise<{ ok: boolean; output: string }> {
  try {
    const { stdout, stderr } = await exec(cmd, args, { cwd, timeout: 120_000 });
    return { ok: true, output: stdout + stderr };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string };
    return { ok: false, output: (e.stdout ?? "") + (e.stderr ?? "") };
  }
}

export async function validate(
  projectPath: string,
  modifiedFiles: string[],
  hasTypeScript: boolean,
): Promise<ValidationReport> {
  const report: ValidationReport = {
    syntaxCheck: { passed: true, errors: [] },
    typeCheck: { passed: true, errors: [] },
    lintCheck: { passed: true, errors: [] },
    testRun: { passed: true, failures: [] },
    overall: "pass",
  };

  if (modifiedFiles.length === 0) return report;

  // Type check
  if (hasTypeScript) {
    const tsc = await tryExec("npx", ["tsc", "--noEmit"], projectPath);
    if (!tsc.ok) {
      report.typeCheck.passed = false;
      report.typeCheck.errors = tsc.output.split("\n").filter((l) => l.includes("error"));
    }
  }

  // Lint
  const lint = await tryExec("npx", ["eslint", ...modifiedFiles], projectPath);
  if (!lint.ok) {
    report.lintCheck.passed = false;
    report.lintCheck.errors = lint.output.split("\n").filter((l) => l.trim().length > 0);
  }

  // Tests
  const test = await tryExec("npm", ["test", "--", "--passWithNoTests"], projectPath);
  if (!test.ok) {
    report.testRun.passed = false;
    report.testRun.failures = test.output.split("\n").filter((l) => l.includes("FAIL"));
  }

  // Overall
  if (!report.typeCheck.passed) report.overall = "fail";
  else if (!report.lintCheck.passed || !report.testRun.passed) report.overall = "partial";

  return report;
}
