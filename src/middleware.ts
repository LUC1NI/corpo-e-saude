import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Middleware no formato legado do Next 16, em runtime EDGE de propósito:
 * o novo `proxy.ts` roda sempre em Node.js, que o deploy no Cloudflare
 * Workers (OpenNext) não suporta — lá o middleware precisa ser Edge.
 * Só renova a sessão do Supabase a cada requisição (compatível com Edge).
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Roda em todas as rotas, exceto:
     * - _next/static, _next/image (assets do Next)
     * - favicon, manifest, service worker e arquivos de imagem
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
