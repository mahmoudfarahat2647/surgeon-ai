import type { FrameworkProfile } from "./types.js";

export const expressProfile: FrameworkProfile = {
  id: "express",
  name: "Express",
  detect: (project) => project.frameworks.includes("express"),
  filePatterns: ["**/*.ts", "**/*.js"],
  knownPitfalls: [
    {
      id: "express/missing-helmet",
      title: "Missing helmet middleware",
      severity: "high",
      description: "Express app without helmet() is missing important HTTP security headers",
      references: ["CWE-16: Configuration"],
    },
  ],
  promptFragments: {
    security: `## Express Security Rules
1. Missing helmet(): No security headers (HSTS, CSP, etc.)
2. Missing rate limiting on auth endpoints
3. CORS misconfiguration: origin: '*' in production
4. req.body without validation schema
5. Missing CSRF protection for state-changing routes
6. SQL injection via string concatenation in queries`,
    reliability: `## Express Reliability Rules
1. Missing error-handling middleware (app.use((err, req, res, next) => ...))
2. Missing 404 handler
3. Unhandled promise rejections in route handlers
4. Missing request timeout middleware`,
  },
};
