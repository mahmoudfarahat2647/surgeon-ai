import fs from "fs/promises";
import path from "path";
import type { ScanResult } from "../types/scan.js";

export function generateJsonString(scanResult: ScanResult): string {
  return JSON.stringify(scanResult, null, 2);
}

export async function generateJson(scanResult: ScanResult, outputDir: string): Promise<void> {
  await fs.writeFile(path.join(outputDir, "audit.json"), generateJsonString(scanResult), "utf-8");
}
