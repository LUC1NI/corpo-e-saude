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
    // Artefatos de build do PWA (gerados pelo Serwist).
    "public/sw.js",
    "public/swe-worker-*.js",
    // Service worker é transpilado pelo Serwist, não pelo lint do app.
    "src/app/sw.ts",
    // Saída do OpenNext (deploy Cloudflare) e entrypoint do worker
    // (importa um arquivo que só existe após o build).
    ".open-next/**",
    ".wrangler/**",
    "worker.ts",
  ]),
]);

export default eslintConfig;
