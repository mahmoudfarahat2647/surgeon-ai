import { Command } from "commander";

export function createProgram(): Command {
  const program = new Command();
  program.name("srgn").description("Surgeon AI — AI-powered codebase audit & repair").version("0.1.0");
  return program;
}
