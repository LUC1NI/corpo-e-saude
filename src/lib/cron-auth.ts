import { timingSafeEqual } from "node:crypto";

/** Compara dois textos em tempo constante (evita timing attack no segredo). */
function comparaSegredo(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Autoriza uma rota de cron via `Authorization: Bearer <CRON_SECRET>`. */
export function autorizarCron(request: Request): { ok: true } | { ok: false; erro: string; status: number } {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) {
    return { ok: false, erro: "CRON_SECRET não configurado.", status: 500 };
  }
  const auth = request.headers.get("authorization") ?? "";
  if (!comparaSegredo(auth, `Bearer ${segredo}`)) {
    return { ok: false, erro: "Não autorizado.", status: 401 };
  }
  return { ok: true };
}
