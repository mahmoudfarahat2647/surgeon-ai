import type { FrameworkProfile, AuditMode } from "./types.js";
import type { ProjectInfo } from "../types/scan.js";

const APP_ROUTER_SECURITY = `## Next.js App Router — Security
1. Server Actions ("use server"): Every exported function is a public POST endpoint. ALL args MUST be validated with zod/valibot. Missing validation = critical vuln.
2. "use client" boundaries: Client components must never import server-only modules (db clients, env secrets). Flag any direct import chain from a "use client" file to a server module.
3. Route Handlers (app/api/.../route.ts): Auth check must be the FIRST operation. Flag any route that touches data before verifying the session.
4. cookies()/headers() from next/headers: Check for timing-safe comparison when reading auth tokens. Never forward raw Set-Cookie values from third-party fetches.
5. Parallel/Intercepted routes: Each slot must have its own error boundary; missing ones cause unhandled rejections that can expose stack traces.
6. next/headers in build-time components: Calling cookies() or headers() in a component rendered at build time crashes silently in production.`;

const APP_ROUTER_RELIABILITY = `## Next.js App Router — Reliability
1. Every dynamic route segment (e.g. app/[id]/page.tsx) needs error.tsx AND not-found.tsx siblings. Missing files surface raw 500/404 to users.
2. Async server components that fetch data need a loading.tsx sibling for Suspense streaming. Without it the whole page blocks.
3. Metadata exports (generateMetadata) that throw will silently fall back — wrap in try/catch and return a sensible default.
4. Server Action error handling: throw new Error() inside "use server" is caught by the nearest error boundary, NOT returned to the caller. Callers that don't check the action result will silently swallow failures.`;

const APP_ROUTER_PERFORMANCE = `## Next.js App Router — Performance
1. "use client" components that import large third-party libraries (charts, editors, date pickers) should use next/dynamic with { ssr: false }.
2. Server components that call fetch() without { cache: 'force-cache' } or next: { revalidate } opt out of caching — each request hits the origin.
3. Images rendered without <Image> from next/image lose automatic lazy loading and format optimisation.
4. route.ts handlers that construct large JSON responses should stream with new Response(ReadableStream) for payloads > 100 KB.`;

const PAGES_ROUTER_SECURITY = `## Next.js Pages Router — Security
1. getServerSideProps: Never return full DB records. Whitelist only the fields the template needs. Returning { props: { user } } where user includes passwordHash = critical data leak.
2. getStaticProps: Secrets fetched at build time must NOT appear in the returned props object (they are serialised into the client bundle).
3. API routes (pages/api/): Auth check must be first. Missing auth before any data access is a critical finding.
4. _document.tsx dangerouslySetInnerHTML: Any unsanitised string inserted here is a stored-XSS vector.
5. Custom getInitialProps on _app.tsx: Runs on every navigation server-side — heavy data fetches here are a DoS surface.`;

const PAGES_ROUTER_RELIABILITY = `## Next.js Pages Router — Reliability
1. API routes that don't call res.end() / res.json() / res.send() leave the request hanging — flag missing terminal response calls.
2. getServerSideProps that throws will render the closest error page but the error is swallowed unless you re-throw — always log before rethrowing.
3. Fallback: true in getStaticPaths without a loading state in the page component causes a hydration mismatch flash.`;

function buildDynamicPrompt(project: ProjectInfo, mode: AuditMode): string {
  const router = project.nextjsRouter;
  if (!router) return "";

  const relevantModes = new Set<AuditMode>(["security", "reliability", "performance", "full"]);
  if (!relevantModes.has(mode)) return "";

  const fragments: string[] = [];

  if (router === "app" || router === "both") {
    if (mode === "security" || mode === "full") fragments.push(APP_ROUTER_SECURITY);
    if (mode === "reliability" || mode === "full") fragments.push(APP_ROUTER_RELIABILITY);
    if (mode === "performance" || mode === "full") fragments.push(APP_ROUTER_PERFORMANCE);
  }

  if (router === "pages" || router === "both") {
    if (mode === "security" || mode === "full") fragments.push(PAGES_ROUTER_SECURITY);
    if (mode === "reliability" || mode === "full") fragments.push(PAGES_ROUTER_RELIABILITY);
  }

  return fragments.join("\n\n");
}

export const nextjsProfile: FrameworkProfile = {
  id: "nextjs",
  name: "Next.js",
  detect: (project) => project.frameworks.includes("next"),
  filePatterns: [
    "app/**/page.{ts,tsx}",
    "app/**/layout.{ts,tsx}",
    "app/**/route.{ts,tsx}",
    "app/**/error.{ts,tsx}",
    "app/**/loading.{ts,tsx}",
    "app/api/**/*",
    "pages/**/*.{ts,tsx}",
    "pages/api/**/*",
    "middleware.{ts,js}",
    "next.config.{js,ts,mjs}",
  ],
  knownPitfalls: [
    {
      id: "nextjs/unsafe-server-action",
      title: "Unvalidated Server Action inputs",
      severity: "critical",
      description: 'Server Actions are public HTTP POST endpoints. Every exported "use server" function must validate its arguments with zod or similar before touching data.',
      codePattern: '"use server"',
      references: ["CWE-20: Improper Input Validation"],
    },
    {
      id: "nextjs/ssr-data-leak",
      title: "Sensitive data passed from server component to client component",
      severity: "critical",
      description: 'A server component passes full DB records or secrets as props to a "use client" component — those values are serialised into the client bundle.',
      references: ["CWE-200: Exposure of Sensitive Information"],
    },
    {
      id: "nextjs/missing-middleware-matcher",
      title: "Middleware matcher does not cover all protected routes",
      severity: "high",
      description: "A new route segment was added without updating the matcher array in middleware.ts, leaving the route unprotected.",
      references: ["CWE-862: Missing Authorization"],
    },
    {
      id: "nextjs/env-var-client-exposure",
      title: "Non-public secret exposed via NEXT_PUBLIC_ prefix",
      severity: "critical",
      description: "Only variables that are intentionally public should use the NEXT_PUBLIC_ prefix. Using it for API keys, DB connection strings, or signing secrets ships them to every browser.",
      references: ["CWE-312: Cleartext Storage of Sensitive Information"],
    },
    {
      id: "nextjs/api-route-missing-auth",
      title: "API route / Route Handler reaches data without auth check",
      severity: "critical",
      description: "Any pages/api or app/api route that reads or writes data without first verifying a session is an unauthenticated endpoint.",
      references: ["CWE-306: Missing Authentication for Critical Function"],
    },
    {
      id: "nextjs/open-redirect",
      title: "Unvalidated redirect target",
      severity: "high",
      description: "Passing user-controlled input to redirect(), router.push(), or res.redirect() without validating the destination enables open-redirect attacks.",
      references: ["CWE-601: URL Redirection to Untrusted Site"],
    },
    {
      id: "nextjs/missing-error-boundary",
      title: "Dynamic route segment missing error.tsx",
      severity: "medium",
      description: "A route segment that performs async work has no error.tsx sibling, so any thrown error surfaces as an unhandled 500 with a raw stack trace.",
      references: ["CWE-755: Improper Handling of Exceptional Conditions"],
    },
    {
      id: "nextjs/getserversideprops-data-leak",
      title: "getServerSideProps returns full database record",
      severity: "high",
      description: "Returning an unsanitised DB object from getServerSideProps embeds all fields (including sensitive ones) into the page's __NEXT_DATA__ JSON, visible to any user.",
      references: ["CWE-200: Exposure of Sensitive Information"],
    },
    {
      id: "nextjs/image-domain-wildcard",
      title: "Wildcard or overly-broad image domain in next.config",
      severity: "medium",
      description: "Using a wildcard hostname in images.domains or remotePatterns turns next/image into an open proxy for any external image.",
      references: ["CWE-441: Unintended Proxy or Intermediary"],
    },
    {
      id: "nextjs/missing-not-found",
      title: "Dynamic route missing not-found.tsx",
      severity: "low",
      description: "A dynamic App Router segment that calls notFound() has no not-found.tsx, so Next.js falls back to the global 404 page, losing any segment-specific context.",
      references: [],
    },
  ],
  promptFragments: {
    security: `## Next.js Security Audit Rules (shared)
1. Inspect next.config.{js,ts}: Check images.remotePatterns for wildcards, headers() for missing CSP/HSTS, redirects() for user-controlled destinations.
2. Environment variables: Flag any secret (key, token, password) named NEXT_PUBLIC_*.
3. Middleware (middleware.ts): Verify the matcher covers every protected route. A route not in the matcher bypasses all middleware auth.
4. Third-party script injection: next/script with dangerouslyAllowSVG or strategy="beforeInteractive" loading untrusted src is an XSS vector.`,

    performance: `## Next.js Performance Audit Rules (shared)
1. Bundle size: Large imports inside "use client" components that should use next/dynamic.
2. Image optimisation: Raw <img> tags that should be next/image.
3. Font loading: Google Fonts loaded via <link> instead of next/font lose layout-shift benefits.`,

    reliability: `## Next.js Reliability Audit Rules (shared)
1. Middleware error handling: Unhandled exceptions in middleware.ts crash the edge runtime silently.
2. next.config revalidate: A revalidate of 0 is equivalent to no caching — verify it is intentional.
3. API route response termination: Every code path in a pages/api handler must call res.end()/json()/send().`,
  },

  dynamicPrompt: buildDynamicPrompt,
};
