import { NextResponse } from "next/server";

import { autorizarCron } from "@/lib/cron-auth";
import { registrarErro } from "@/lib/logs";
import { createAdminClient } from "@/lib/supabase/admin";
import { executarRenovacao } from "@/lib/renovacao";

export const dynamic = "force-dynamic";

/**
 * Cron de renovação automática. Gera as mensalidades pendentes das matrículas
 * ativas e marca vencidos. Protegido por `CRON_SECRET` (Bearer) — a Vercel
 * injeta esse header automaticamente nos Vercel Crons.
 *
 * Agende em produção (vercel.json) ou aponte um agendador externo para:
 *   GET /api/cron/renovar   com  Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request): Promise<Response> {
  const autorizacao = autorizarCron(request);
  if (!autorizacao.ok) {
    return NextResponse.json({ ok: false, erro: autorizacao.erro }, { status: autorizacao.status });
  }

  try {
    const supabase = createAdminClient();
    const { geradas } = await executarRenovacao(supabase);
    // Limpeza oportunista das janelas de rate-limit expiradas.
    await supabase.rpc("rl_limpar");
    return NextResponse.json({ ok: true, geradas });
  } catch (e) {
    console.error("cron/renovar falhou:", e);
    await registrarErro("cron/renovar", e);
    return NextResponse.json(
      { ok: false, erro: "Falha ao renovar." },
      { status: 500 },
    );
  }
}
