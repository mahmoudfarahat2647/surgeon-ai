import type { FrameworkProfile } from "./types.js";

export const nextjsProfile: FrameworkProfile = {
  id: "nextjs",
  name: "Next.js",
  detect: (project) => project.frameworks.includes("next"),
  filePatterns: ["app/**/page.{ts,tsx}", "app/**/layout.{ts,tsx}", "app/**/route.{ts,tsx}", "app/api/**/*", "middleware.{ts,js}"],
  knownPitfalls: [
    {
      id: "nextjs/unsafe-server-action",
      title: "Unvalidated Server Action inputs",
      severity: "critical",
      description: "Server Actions are public HTTP endpoints. Arguments must be validated with zod or similar.",
      codePattern: '"use server"',
      references: ["CWE-20: Improper Input Validation"],
    },
    {
      id: "nextjs/ssr-data-leak",
      title: "Sensitive data passed from server to client component",
      severity: "critical",
      description: "Server component passes DB records or secrets as props to a 'use client' component.",
      references: ["CWE-200: Exposure of Sensitive Information"],
    },
    {
      id: "nextjs/missing-middleware-matcher",
      title: "Middleware matcher doesn't cover all protected routes",
      severity: "high",
      description: "New route segments added without updating middleware.ts matcher.",
      references: ["CWE-862: Missing Authorization"],
    },
  ],
  promptFragments: {
    security: `## Next.js Security Audit Rules
1. Server Actions: Check ALL "use server" functions validate inputs. They are public HTTP endpoints.
2. API Routes (app/api/): Check for missing auth, unvalidated bodies, injection via query params.
3. Middleware bypass: Ensure middleware.ts matcher covers all protected routes.
4. SSR data exposure: Check server components don't pass secrets/DB records to client components.
5. Dynamic rendering secrets: Ensure secrets aren't in dynamically rendered pages (client bundles).
6. Image/redirect open redirect: Check next.config.js images.domains and redirects.`,
    performance: `## Next.js Performance Audit Rules
1. Bundle size: Large client-side imports that should use next/dynamic.
2. Missing Suspense: Pages with async data should use Suspense for streaming.
3. Image optimization: <img> tags that should be <Image> from next/image.
4. Client component bloat: "use client" components that could be split.`,
    reliability: `## Next.js Reliability Audit Rules
1. Missing error.tsx in route segments.
2. Missing loading.tsx in segments with async data.
3. Missing not-found.tsx for dynamic routes.
4. Middleware error handling: unhandled exceptions in middleware.ts.
5. API route error responses: proper status codes and structured errors.`,
  },
};
