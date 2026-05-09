import { describe, it, expect } from "vitest";
import { detectFromPackageJson } from "@/discovery/detector.js";

describe("detectFromPackageJson", () => {
  it("detects Next.js from dependencies", () => {
    const result = detectFromPackageJson({
      name: "my-app",
      dependencies: { next: "14.0.0", react: "18.0.0" },
    });
    expect(result.frameworks).toContain("next");
    expect(result.frameworks).toContain("react");
  });

  it("detects Express from dependencies", () => {
    const result = detectFromPackageJson({
      name: "api",
      dependencies: { express: "4.18.0" },
    });
    expect(result.frameworks).toContain("express");
    expect(result.frameworks).not.toContain("react");
  });

  it("detects package manager from lockfile hints", () => {
    const result = detectFromPackageJson({ name: "app" }, "pnpm-lock.yaml");
    expect(result.packageManager).toBe("pnpm");
  });

  it("returns empty frameworks for bare project", () => {
    const result = detectFromPackageJson({ name: "bare" });
    expect(result.frameworks).toEqual([]);
  });
});
