import fs from "fs/promises";
import path from "path";
import type { ScanResult } from "../types/scan.js";

export async function saveToHistory(scanResult: ScanResult, outputDir: string): Promise<void> {
  const historyDir = path.join(outputDir, "history");
  await fs.mkdir(historyDir, { recursive: true });
  const filename = scanResult.meta.timestamp.replace(/:/g, "-") + ".json";
  await fs.writeFile(path.join(historyDir, filename), JSON.stringify(scanResult, null, 2), "utf-8");
}
