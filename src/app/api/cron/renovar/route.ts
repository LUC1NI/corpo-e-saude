import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { executarRenovacao } from "@/lib/renovacao";

export const dynamic = "force-dynamic";

/** Compara dois textos em tempo constante (evita timing attack no segredo). */
function comparaSegredo(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Cron de renovação automática. Gera as mensalidades pendentes das matrículas
 * ativas e marca vencidos. Protegido por `CRON_SECRET` (Bearer) — a Vercel
 * injeta esse header automaticamente nos Vercel Crons.
 *
 * Agende em produção (vercel.json) ou aponte um agendador externo para:
 *   GET /api/cron/renovar   com  Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request): Promise<Response> {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) {
    return NextResponse.json(
      { ok: false, erro: "CRON_SECRET não configurado." },
      { status: 500 },
    );
  }

  const auth = request.headers.get("authorization") ?? "";
  if (!comparaSegredo(auth, `Bearer ${segredo}`)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { geradas } = await executarRenovacao(supabase);
    // Limpeza oportunista das janelas de rate-limit expiradas.
    await supabase.rpc("rl_limpar");
    return NextResponse.json({ ok: true, geradas });
  } catch (e) {
    console.error("cron/renovar falhou:", e);
    return NextResponse.json(
      { ok: false, erro: "Falha ao renovar." },
      { status: 500 },
    );
  }
}
