import type { FrameworkProfile } from "./types.js";

export const nestjsProfile: FrameworkProfile = {
  id: "nestjs",
  name: "NestJS",
  detect: (project) => project.frameworks.includes("nestjs"),
  filePatterns: ["**/*.controller.ts", "**/*.service.ts", "**/*.module.ts", "**/*.guard.ts"],
  knownPitfalls: [
    {
      id: "nestjs/missing-guard",
      title: "Controller missing AuthGuard",
      severity: "critical",
      description: "NestJS controller methods without @UseGuards are publicly accessible",
      references: ["CWE-862: Missing Authorization"],
    },
  ],
  promptFragments: {
    security: `## NestJS Security Rules
1. Missing @UseGuards on controller methods/classes
2. Missing @Roles decorator when RBAC is used
3. DTO validation: missing ValidationPipe or class-validator decorators
4. Unsafe TypeORM queries: QueryBuilder with string interpolation
5. Missing rate limiting on public endpoints`,
    reliability: `## NestJS Reliability Rules
1. Circular dependencies between modules
2. Missing exception filters for specific error types
3. Unhandled async exceptions in lifecycle hooks
4. Missing OnModuleDestroy for cleanup`,
  },
};
