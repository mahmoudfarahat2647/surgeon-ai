import type { FrameworkProfile } from "./types.js";

export const baseProfile: FrameworkProfile = {
  id: "base",
  name: "Universal",
  detect: () => true,
  filePatterns: ["**/*"],
  knownPitfalls: [],
  promptFragments: {
    security: `## Universal Security Rules
1. Command injection: child_process.exec with unsanitized user input
2. Path traversal: fs operations with unsanitized paths
3. Prototype pollution: Object.assign/spread from user input
4. Regex DoS: Complex regex on user-controlled strings
5. Hardcoded secrets: API keys, tokens, passwords in source code
6. Insecure randomness: Math.random() for security-sensitive operations
7. Eval usage: eval(), Function(), vm.runInNewContext with user data
8. Missing input validation at system boundaries`,
    performance: `## Universal Performance Rules
1. N+1 queries: Database calls inside loops
2. Missing pagination: Unbounded array/query results
3. Sync file I/O: fs.readFileSync in request handlers
4. Memory leaks: Event listeners without cleanup, unbounded caches
5. Unnecessary re-computation: Expensive ops without memoization
6. Large payloads: Unbounded response sizes`,
    reliability: `## Universal Reliability Rules
1. Unhandled promise rejections
2. Missing error handling in async operations
3. Race conditions in concurrent code
4. Null/undefined access without guards
5. Resource cleanup: missing finally blocks, unclosed connections`,
    maintainability: `## Universal Maintainability Rules
1. Functions over 50 lines
2. Deeply nested conditionals (>3 levels)
3. Duplicate code blocks
4. Magic numbers/strings without constants
5. Unclear variable/function naming`,
    tests: `## Universal Testing Rules
1. Missing tests for critical business logic
2. Tests that don't assert anything meaningful
3. Flaky test patterns (timing, network, shared state)
4. Missing edge case coverage (empty, null, boundary values)
5. Test files that don't match source file structure`,
  },
};
