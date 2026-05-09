import { describe, it, expect } from "vitest";
import { detectProfiles } from "@/profiles/index.js";
import type { ProjectInfo } from "@/types/scan.js";

function makeProject(overrides: Partial<ProjectInfo> = {}): ProjectInfo {
  return {
    name: "test",
    languages: ["typescript"],
    frameworks: [],
    packageManager: "pnpm",
    totalFiles: 10,
    scannedFiles: 10,
    ...overrides,
  };
}

describe("detectProfiles", () => {
  it("always includes base profile", () => {
    const profiles = detectProfiles(makeProject());
    expect(profiles.some((p) => p.id === "base")).toBe(true);
  });

  it("detects Next.js profile from frameworks", () => {
    const profiles = detectProfiles(makeProject({ frameworks: ["next", "react"] }));
    expect(profiles.some((p) => p.id === "nextjs")).toBe(true);
    expect(profiles.some((p) => p.id === "react")).toBe(true);
  });

  it("detects Express profile", () => {
    const profiles = detectProfiles(makeProject({ frameworks: ["express"] }));
    expect(profiles.some((p) => p.id === "express")).toBe(true);
    expect(profiles.some((p) => p.id === "react")).toBe(false);
  });

  it("includes typescript profile when language detected", () => {
    const profiles = detectProfiles(makeProject({ languages: ["typescript"] }));
    expect(profiles.some((p) => p.id === "typescript")).toBe(true);
  });
});
