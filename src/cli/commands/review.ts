import path from "path";
import fs from "fs/promises";
import { printError } from "../output.js";
import type { ScanResult } from "../../types/scan.js";

export async function reviewCommand(): Promise<void> {
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

  // Dynamic import Ink TUI to avoid loading React for non-TUI commands
  const { renderApp } = await import("../../tui/App.js");
  renderApp(scanResult);
}
