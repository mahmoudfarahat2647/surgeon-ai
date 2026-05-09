import type { FrameworkProfile } from "./types.js";

export const testingProfile: FrameworkProfile = {
  id: "testing",
  name: "Testing",
  detect: (project) => project.languages.includes("typescript") || project.languages.includes("javascript"),
  filePatterns: ["**/*.test.ts", "**/*.spec.ts", "**/*.test.tsx", "**/*.spec.tsx"],
  knownPitfalls: [
    {
      id: "testing/no-assertions",
      title: "Test with no assertions",
      severity: "medium",
      description: "Tests that pass without asserting anything give false confidence",
      references: ["Testing Best Practices"],
    },
  ],
  promptFragments: {
    tests: `## Test Quality Rules
1. Tests with no expect() calls — they always pass and provide no value
2. Overly broad assertions — toBeTruthy() when toEqual(expectedValue) is possible
3. Tests depending on execution order — shared mutable state between tests
4. Missing afterEach cleanup — timers, mocks, listeners left active
5. Network calls in unit tests — missing vi.mock() for external services
6. Tests that test implementation not behavior — brittle, refactor-sensitive
7. Missing negative test cases — only happy path tested`,
  },
};
