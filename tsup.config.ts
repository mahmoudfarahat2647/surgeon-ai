import { defineConfig } from "tsup";
import type { Plugin } from "esbuild";

/**
 * ink optionally imports react-devtools-core (only when the user has explicitly
 * configured React DevTools, never in a CLI context).  The package is not
 * installed, so we stub it with an empty module to prevent esbuild from failing
 * the bundle step.
 */
const stubOptionalDeps: Plugin = {
  name: "stub-optional-deps",
  setup(build) {
    build.onResolve({ filter: /^react-devtools-core$/ }, () => ({
      path: "react-devtools-core",
      namespace: "stub",
    }));
    build.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
      contents: "export default null; export const connectToDevTools = () => {};",
      loader: "js",
    }));
  },
};

export default defineConfig([
  // ─── CLI binary ───────────────────────────────────────────────────────────
  // Bundle *everything* into a single file so `npm install -g surgeon-ai`
  // downloads one self-contained binary with zero runtime dep resolution.
  {
    entry: { srgn: "bin/srgn.ts" },
    format: ["esm"],
    target: "node20",
    outDir: "dist",
    clean: true,
    splitting: false,
    sourcemap: true,
    dts: false,
    noExternal: [/.*/],
    esbuildPlugins: [stubOptionalDeps],
    // Inject a proper `require` function so CJS packages (commander, etc.)
    // bundled inside the ESM binary can resolve Node.js built-ins at runtime.
    banner: {
      js: [
        "#!/usr/bin/env node",
        'import { createRequire } from "module";',
        "const require = createRequire(import.meta.url);",
      ].join("\n"),
    },
  },

  // ─── Library entry ────────────────────────────────────────────────────────
  // Keep node_modules external so library consumers manage their own versions.
  // The stub plugin is shared defensively — ink is external here so it
  // never actually fires, but it prevents cross-config context bleed in tsup.
  {
    entry: { index: "src/index.ts" },
    format: ["esm"],
    target: "node20",
    outDir: "dist",
    clean: false,
    splitting: false,
    sourcemap: true,
    dts: true,
    esbuildPlugins: [stubOptionalDeps],
  },
]);
