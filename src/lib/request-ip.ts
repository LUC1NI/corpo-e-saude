import { headers } from "next/headers";

/** IP do cliente, a partir dos headers da borda da Cloudflare (não-spoofável). */
export async function clienteIp(): Promise<string> {
  const h = await headers();
  // cf-connecting-ip é definido pela borda da Cloudflare (não-spoofável);
  // o primeiro item do x-forwarded-for pode ser forjado pelo cliente, então
  // fica só como último recurso (evita burlar o rate limit trocando de "IP").
  return (
    h.get("cf-connecting-ip")?.trim() ??
    h.get("x-real-ip")?.trim() ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local"
  );
}
