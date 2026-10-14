"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { falha, sucesso, type ResultadoAcao } from "@/lib/acoes";
import { assertPapel } from "@/lib/auth";
import { cancelarNotaFiscal, emitirNotaDoPagamento } from "@/lib/nfse/servico";
import {
  cancelarNotaSchema,
  configFiscalSchema,
  type ConfigFiscalInput,
} from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

function revalidarNotas() {
  revalidatePath("/admin/financeiro/recebimentos");
  revalidatePath("/admin/financeiro/nota-fiscal");
  revalidatePath("/aluno/mensalidade");
}

/** Emite (ou reemite, se deu erro) a nota de um pagamento pago. */
export async function emitirNota(
  pagamentoId: string,
): Promise<ResultadoAcao<{ mensagem: string }>> {
  await assertPapel(["admin"]);
  if (!z.string().uuid().safeParse(pagamentoId).success) return falha("Pagamento inválido.");
  const supabase = await createClient();
  const r = await emitirNotaDoPagamento(supabase, pagamentoId);
  revalidarNotas();
  if (r.status === null || r.status === "erro") return falha(r.mensagem);
  return sucesso({ mensagem: r.mensagem });
}

/**
 * Emissão em lote: tudo que está aguardando configuração ou com erro. Usado
 * quando a API for ligada. Limite por rodada para caber no tempo do Worker.
 */
export async function emitirNotasPendentes(): Promise<
  ResultadoAcao<{ autorizadas: number; processando: number; pendentes: number }>
> {
  await assertPapel(["admin"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("notas_fiscais")
    .select("pagamento_id")
    .in("status", ["aguardando_configuracao", "erro"])
    .order("criado_em")
    .limit(25);

  const contagem = { autorizadas: 0, processando: 0, pendentes: 0 };
  for (const n of (data ?? []) as { pagamento_id: string }[]) {
    const r = await emitirNotaDoPagamento(supabase, n.pagamento_id);
    if (r.status === "autorizada") contagem.autorizadas += 1;
    else if (r.status === "processando") contagem.processando += 1;
    else contagem.pendentes += 1;
  }
  revalidarNotas();
  return sucesso(contagem);
}

export async function cancelarNota(
  notaId: string,
  justificativa: string,
): Promise<ResultadoAcao> {
  await assertPapel(["admin"]);
  const parsed = cancelarNotaSchema.safeParse({ notaId, justificativa });
  if (!parsed.success) {
    return falha(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const supabase = await createClient();
  const r = await cancelarNotaFiscal(supabase, parsed.data.notaId, parsed.data.justificativa);
  revalidarNotas();
  return r.ok ? sucesso() : falha(r.mensagem);
}

export async function salvarConfigFiscal(
  input: ConfigFiscalInput,
): Promise<ResultadoAcao> {
  await assertPapel(["admin"]);
  const parsed = configFiscalSchema.safeParse(input);
  if (!parsed.success) {
    return falha(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("config_fiscal")
    .update({
      ...d,
      cnpj: d.cnpj ?? null,
      inscricao_municipal: d.inscricao_municipal ?? null,
      codigo_servico: d.codigo_servico ?? null,
      codigo_tributacao_nacional: d.codigo_tributacao_nacional ?? null,
      aliquota_iss: d.aliquota_iss ?? null,
      natureza_operacao: d.natureza_operacao ?? null,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) return falha("Não foi possível salvar a configuração.");
  revalidarNotas();
  return sucesso();
}
