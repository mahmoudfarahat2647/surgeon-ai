import fs from "fs/promises";
import path from "path";
import { DEFAULT_CONFIG } from "../../config/defaults.js";
import { printSuccess, printInfo } from "../output.js";

export async function initCommand(): Promise<void> {
  const surgeonDir = path.resolve(".surgeon");
  await fs.mkdir(surgeonDir, { recursive: true });
  const configPath = path.join(surgeonDir, "config.json");

  try {
    await fs.access(configPath);
    printInfo(".surgeon/config.json already exists, skipping.");
  } catch {
    await fs.writeFile(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf-8");
    printSuccess("Created .surgeon/config.json with default settings.");
  }
}
