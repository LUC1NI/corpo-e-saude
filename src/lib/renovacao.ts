import type { SupabaseClient } from "@supabase/supabase-js";

import {
  competenciaDe,
  hojeISO,
  proximaCobranca,
} from "@/lib/financeiro";
import type { Periodicidade } from "@/lib/tipos";

/**
 * Núcleo da renovação automática: gera os `pagamentos` pendentes das
 * matrículas ativas cuja `data_proxima_cobranca` já chegou (catch-up por
 * período em atraso) e marca como `vencido` o que passou do vencimento.
 *
 * Recebe o client para servir tanto a ação do admin (RLS do usuário) quanto
 * o cron (service-role). Retorna quantas cobranças foram geradas.
 */
export async function executarRenovacao(
  supabase: SupabaseClient,
): Promise<{ geradas: number }> {
  const hoje = hojeISO();

  const { data: matriculas, error } = await supabase
    .from("matriculas")
    .select("id, aluno_id, data_proxima_cobranca, planos(valor, periodicidade)")
    .eq("status", "ativa")
    .eq("renovacao_automatica", true)
    .lte("data_proxima_cobranca", hoje);
  if (error) throw new Error("Não foi possível consultar as matrículas.");

  let geradas = 0;

  for (const m of matriculas ?? []) {
    const plano = (
      m as unknown as {
        planos: { valor: number; periodicidade: Periodicidade } | null;
      }
    ).planos;
    if (!plano) continue;

    let proxima = m.data_proxima_cobranca as string;
    const novosPagamentos: Record<string, unknown>[] = [];

    while (proxima <= hoje) {
      novosPagamentos.push({
        matricula_id: m.id,
        aluno_id: m.aluno_id,
        competencia: competenciaDe(proxima),
        valor: plano.valor,
        vencimento: proxima,
        status: "pendente",
      });
      proxima = proximaCobranca(proxima, plano.periodicidade);
    }

    if (novosPagamentos.length > 0) {
      const { error: errIns } = await supabase
        .from("pagamentos")
        .insert(novosPagamentos);
      if (errIns) continue;
      await supabase
        .from("matriculas")
        .update({ data_proxima_cobranca: proxima })
        .eq("id", m.id);
      geradas += novosPagamentos.length;
    }
  }

  // Marca como vencidos os pendentes cujo vencimento já passou.
  await supabase
    .from("pagamentos")
    .update({ status: "vencido" })
    .eq("status", "pendente")
    .lt("vencimento", hoje);

  return { geradas };
}
