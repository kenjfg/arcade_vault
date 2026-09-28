import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // references/templates/ is a static CDN + in-browser Babel prototype
    // (see AGENTS.md/CLAUDE.md): it runs as plain <script> tags in the
    // browser, not through Node/ESLint's module or globals resolution.
    "references/templates/**",
  ]),
]);

export default eslintConfig;
