import path from "path";
import fs from "fs/promises";
import { generateReports } from "../../reporter/index.js";
import { printSuccess, printError } from "../output.js";
import type { ScanResult } from "../../types/scan.js";

interface ReportFlags {
  format?: string;
  output?: string;
}

export async function reportCommand(flags: ReportFlags): Promise<void> {
  const lastScanPath = path.resolve(".surgeon", "last-scan.json");
  let scanResult: ScanResult;
  try {
    const raw = await fs.readFile(lastScanPath, "utf-8");
    scanResult = JSON.parse(raw);
  } catch {
    printError("No scan results found. Run 'srgn scan .' first.");
    process.exit(1);
    return;
  }

  const outputDir = flags.output ?? "surgeon-tests";
  const format = (flags.format ?? "all") as "json" | "md" | "html" | "all";
  await generateReports(scanResult, { output: outputDir, format });
  printSuccess(`Reports regenerated in ${outputDir}/`);
}
