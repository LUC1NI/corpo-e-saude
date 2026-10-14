/**
 * Endereço público do site, sem barra no final. Fonte única: a variável
 * `NEXT_PUBLIC_SITE_URL` (no deploy vem do wrangler.jsonc). Trocar de domínio
 * = trocar a variável e publicar de novo; nenhum código muda. Ver DEPLOY.md.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

/** URL absoluta para um caminho interno (ex.: `urlAbsoluta("/entrar")`). */
export function urlAbsoluta(caminho: string): string {
  return `${SITE_URL}${caminho.startsWith("/") ? caminho : `/${caminho}`}`;
}
