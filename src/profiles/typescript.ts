import type { FrameworkProfile } from "./types.js";

export const typescriptProfile: FrameworkProfile = {
  id: "typescript",
  name: "TypeScript",
  detect: (project) => project.languages.includes("typescript"),
  filePatterns: ["**/*.ts", "**/*.tsx"],
  knownPitfalls: [
    {
      id: "ts/any-escape",
      title: "Unsafe any cast",
      severity: "medium",
      description: "Using `as any` bypasses type safety and can hide bugs",
      references: ["TypeScript Handbook"],
    },
  ],
  promptFragments: {
    security: `## TypeScript Security Rules
1. Type assertions (as X): unsafe casts that bypass type checking
2. @ts-ignore/@ts-expect-error: suppressed errors that may hide vulnerabilities
3. any types from external data: JSON.parse() returns any — must be validated`,
    maintainability: `## TypeScript Maintainability Rules
1. Excessive use of 'any' type defeats TypeScript's purpose
2. Missing return type annotations on exported functions
3. Non-null assertions (!) without guards
4. Enums vs const objects: prefer const objects for tree-shaking`,
    reliability: `## TypeScript Reliability Rules
1. Strict null checks: potential null/undefined access
2. Optional chaining missing where properties may be undefined
3. Type narrowing gaps: switch exhaustiveness not checked`,
  },
};
