import type { FrameworkProfile } from "./types.js";

export const reactProfile: FrameworkProfile = {
  id: "react",
  name: "React",
  detect: (project) => project.frameworks.includes("react"),
  filePatterns: ["**/*.tsx", "**/*.jsx"],
  knownPitfalls: [
    {
      id: "react/xss-dangerouslysetinnerhtml",
      title: "XSS via dangerouslySetInnerHTML",
      severity: "critical",
      description: "dangerouslySetInnerHTML with unsanitized user content allows XSS",
      references: ["CWE-79: Cross-Site Scripting"],
    },
  ],
  promptFragments: {
    security: `## React Security Rules
1. dangerouslySetInnerHTML: must sanitize user content (use DOMPurify)
2. href/src from user input: open redirect and javascript: URIs
3. eval() in component: avoid at all costs
4. Exposing sensitive data in component props or state`,
    performance: `## React Performance Rules
1. Missing React.memo on expensive components
2. useCallback/useMemo missing for stable references passed to children
3. Object/array literals in JSX causing unnecessary re-renders
4. Large lists without virtualization (react-window/react-virtual)
5. Missing key prop on list items`,
    reliability: `## React Reliability Rules
1. useEffect missing cleanup (memory leaks from subscriptions/timers)
2. State updates on unmounted components
3. Missing error boundaries for async components
4. Conditional hook calls (violates rules of hooks)`,
  },
};
