import type { FrameworkProfile } from "./types.js";

export const nodeProfile: FrameworkProfile = {
  id: "node",
  name: "Node.js",
  detect: (project) => project.languages.includes("javascript") || project.languages.includes("typescript"),
  filePatterns: ["**/*.js", "**/*.ts", "**/*.mjs", "**/*.cjs"],
  knownPitfalls: [
    {
      id: "node/sync-io-in-handler",
      title: "Synchronous I/O in request handler",
      severity: "high",
      description: "fs.readFileSync/writeFileSync blocks the event loop",
      references: ["Node.js Best Practices"],
    },
  ],
  promptFragments: {
    security: `## Node.js Security Rules
1. child_process: exec/execSync with user input allows command injection
2. fs: path traversal via unsanitized user-controlled paths
3. eval/vm: dynamic code execution with user data
4. HTTP server: missing request size limits (dos via large bodies)
5. Environment variables: secrets should not be logged or exposed`,
    performance: `## Node.js Performance Rules
1. Synchronous I/O (readFileSync, writeFileSync) in request handlers blocks event loop
2. Large buffers: fs.readFile on files that should be streamed
3. CPU-bound work should be offloaded to worker_threads
4. Unoptimized regex on large inputs`,
    reliability: `## Node.js Reliability Rules
1. Uncaught exceptions crashing the process
2. Unhandled promise rejections
3. Missing SIGTERM/SIGINT handlers for graceful shutdown
4. EventEmitter memory leak warnings (missing removeListener)`,
  },
};
