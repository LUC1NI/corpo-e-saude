import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Config vazia do Turbopack: o Serwist injeta config webpack (usada só
  // no `build --webpack`). Declarar `turbopack` evita o erro do `next dev`
  // por haver config webpack sem config turbopack.
  turbopack: {},
};

/**
 * PWA via Serwist (modo webpack).
 *
 * - `dev`: usa Turbopack e o SW fica desabilitado (evita cache atrapalhar
 *   o desenvolvimento).
 * - `build`: roda com `next build --webpack`, gerando o `public/sw.js`
 *   com o precache dos assets de build.
 */
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
