import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy. 'unsafe-inline' em script/style é necessário para o
// Next (scripts de hydration inline) sem nonce; 'unsafe-eval' só no dev (HMR).
// img-src https: libera as mídias externas de exercício (ex.: Wikimedia).
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  // Mapa do Google incorporado na landing (seção "Onde estamos").
  "frame-src https://www.google.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  // Em produção (HTTPS), promove qualquer subrecurso http:// para https://
  // — barreira contra conteúdo misto. Inofensivo fora de HTTPS.
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // Isola o contexto de navegação (defesa contra XS-Leaks e tabnabbing
  // via window.opener).
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Bloqueia políticas cross-domain legadas (Flash/Acrobat).
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Config vazia do Turbopack: o Serwist injeta config webpack (usada só
  // no `build --webpack`). Declarar `turbopack` evita o erro do `next dev`
  // por haver config webpack sem config turbopack.
  turbopack: {},
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
