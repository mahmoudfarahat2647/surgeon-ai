import type { FrameworkProfile } from "./types.js";

export const fastifyProfile: FrameworkProfile = {
  id: "fastify",
  name: "Fastify",
  detect: (project) => project.frameworks.includes("fastify"),
  filePatterns: ["**/*.ts", "**/*.js"],
  knownPitfalls: [],
  promptFragments: {
    security: `## Fastify Security Rules
1. Schema validation: routes without schema validation bypass type safety
2. Reply serialization: custom serializers that leak internal data
3. Plugin encapsulation: improperly scoped decorators/hooks
4. JWT verification: missing or weak JWT validation in preHandler`,
    performance: `## Fastify Performance Rules
1. Missing schema on routes disables fast-json-stringify optimization
2. Synchronous operations in async handlers
3. Plugin loading order affecting startup time`,
  },
};
