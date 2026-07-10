import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * Config do adapter OpenNext → Cloudflare Workers.
 *
 * Padrão minimalista de propósito: sem cache incremental (o app é quase todo
 * dinâmico por usuário) e sem bindings extras. O build roda o script `build`
 * do package.json (`next build --webpack`, exigido pelo Serwist/PWA).
 */
export default defineCloudflareConfig();
