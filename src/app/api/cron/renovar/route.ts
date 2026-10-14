import { NextResponse } from "next/server";

import { autorizarCron } from "@/lib/cron-auth";
import { registrarErro } from "@/lib/logs";
import { createAdminClient } from "@/lib/supabase/admin";
import { sincronizarNotasPendentes } from "@/lib/nfse/servico";
import { enviarLembretesMensalidade } from "@/lib/push";
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
    // Lembretes de mensalidade (push), depois da renovação.
    const lembretes = await enviarLembretesMensalidade(supabase);
    // Fallback do webhook da NFS-e: notas "processando" há mais de 1 hora.
    const notasSincronizadas = await sincronizarNotasPendentes(supabase);
    return NextResponse.json({ ok: true, geradas, lembretes, notasSincronizadas });
  } catch (e) {
    console.error("cron/renovar falhou:", e);
    await registrarErro("cron/renovar", e);
    return NextResponse.json(
      { ok: false, erro: "Falha ao renovar." },
      { status: 500 },
    );
  }
}
