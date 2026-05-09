import fs from "fs/promises";
import { generateJson } from "./json.js";
import { generateMarkdown } from "./markdown.js";
import { generateHtml } from "./html/generator.js";
import { saveToHistory } from "./history.js";
import type { ScanResult } from "../types/scan.js";

export { generateJsonString } from "./json.js";
export { generateMarkdownString } from "./markdown.js";

export async function generateReports(
  scanResult: ScanResult,
  options: { output: string; format: "json" | "md" | "html" | "all" },
): Promise<void> {
  await fs.mkdir(options.output, { recursive: true });

  const generators: Record<string, () => Promise<void>> = {
    json: () => generateJson(scanResult, options.output),
    md: () => generateMarkdown(scanResult, options.output),
    html: () => generateHtml(scanResult, options.output),
  };

  if (options.format === "all") {
    await Promise.all(Object.values(generators).map((fn) => fn()));
  } else {
    await generators[options.format]();
  }

  await saveToHistory(scanResult, options.output);
}
