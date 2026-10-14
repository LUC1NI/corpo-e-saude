"use server";

import { revalidatePath } from "next/cache";

import { assertPapel } from "@/lib/auth";
import { falha, sucesso, type ResultadoAcao } from "@/lib/acoes";
import {
  competenciaDe,
  hojeISO,
  proximaCobranca,
} from "@/lib/financeiro";
import {
  despesaSchema,
  matriculaSchema,
  type DespesaInput,
  type MatriculaInput,
} from "@/lib/schemas";
import { carregarConfigFiscal, emitirNotaDoPagamento } from "@/lib/nfse/servico";
import { createClient } from "@/lib/supabase/server";
import type { Periodicidade } from "@/lib/tipos";

// ---------------------------------------------------------------------------
// Matrícula — vincula aluno a plano e gera o 1º pagamento (pendente)
// ---------------------------------------------------------------------------
export async function criarMatricula(
  alunoId: string,
  input: MatriculaInput,
): Promise<ResultadoAcao> {
  await assertPapel(["admin"]);
  const parsed = matriculaSchema.safeParse(input);
  if (!parsed.success) {
    return falha(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const supabase = await createClient();

  // Não permite duas matrículas ativas para o mesmo aluno (evita cobrança
  // dobrada na renovação). A UI já esconde o form, mas garantimos no servidor.
  const { data: ativaExistente } = await supabase
    .from("matriculas")
    .select("id")
    .eq("aluno_id", alunoId)
    .eq("status", "ativa")
    .limit(1)
    .maybeSingle();
  if (ativaExistente) {
    return falha(
      "Este aluno já tem uma matrícula ativa. Cancele a atual antes de criar outra.",
    );
  }

  const { data: plano } = await supabase
    .from("planos")
    .select("valor, periodicidade")
    .eq("id", parsed.data.plano_id)
    .maybeSingle();
  if (!plano) return falha("Plano não encontrado.");

  const periodicidade = plano.periodicidade as Periodicidade;
  const proxima = proximaCobranca(parsed.data.data_inicio, periodicidade);

  const { data: matricula, error: errMat } = await supabase
    .from("matriculas")
    .insert({
      aluno_id: alunoId,
      plano_id: parsed.data.plano_id,
      data_inicio: parsed.data.data_inicio,
      data_proxima_cobranca: proxima,
      renovacao_automatica: parsed.data.renovacao_automatica,
      status: "ativa",
    })
    .select("id")
    .single();
  if (errMat || !matricula) return falha("Não foi possível criar a matrícula.");

  // Primeiro pagamento (referente ao período inicial). Não duplica: se o aluno
  // já tem uma cobrança nessa competência (ex.: rematrícula no mesmo mês após
  // um cancelamento), reaproveita-a em vez de gerar outra.
  const competencia = competenciaDe(parsed.data.data_inicio);
  const { data: existente } = await supabase
    .from("pagamentos")
    .select("id")
    .eq("aluno_id", alunoId)
    .eq("competencia", competencia)
    .limit(1)
    .maybeSingle();

  if (!existente) {
    const { error: errPag } = await supabase.from("pagamentos").insert({
      matricula_id: matricula.id,
      aluno_id: alunoId,
      competencia,
      valor: plano.valor,
      vencimento: parsed.data.data_inicio,
      status: "pendente",
    });
    if (errPag) {
      return falha("Matrícula criada, mas falhou ao gerar a cobrança.");
    }
  }

  revalidatePath(`/admin/alunos/${alunoId}`);
  revalidatePath("/admin/financeiro");
  return sucesso();
}

export async function cancelarMatricula(
  matriculaId: string,
  alunoId: string,
): Promise<ResultadoAcao> {
  await assertPapel(["admin"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("matriculas")
    .update({ status: "cancelada" })
    .eq("id", matriculaId);
  if (error) return falha("Não foi possível cancelar a matrícula.");

  revalidatePath(`/admin/alunos/${alunoId}`);
  revalidatePath("/admin/financeiro");
  return sucesso();
}

// ---------------------------------------------------------------------------
// Baixa de pagamento (recebimento)
// ---------------------------------------------------------------------------
export async function marcarPagamentoPago(
  pagamentoId: string,
  formaPagamento?: string,
): Promise<ResultadoAcao<{ avisoNota?: string }>> {
  await assertPapel(["admin"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("pagamentos")
    .update({
      status: "pago",
      data_pagamento: hojeISO(),
      forma_pagamento: formaPagamento ?? null,
    })
    .eq("id", pagamentoId);
  if (error) return falha("Não foi possível dar baixa no pagamento.");

  // Nota fiscal depois da baixa. A baixa NUNCA falha por causa da nota:
  // qualquer problema vira status/mensagem na própria nota.
  let avisoNota: string | undefined;
  try {
    const config = await carregarConfigFiscal(supabase);
    if (config?.emitir_automaticamente_na_baixa) {
      avisoNota = (await emitirNotaDoPagamento(supabase, pagamentoId)).mensagem;
    }
  } catch {
    avisoNota = "Pagamento confirmado, mas a nota não foi gerada. Emita em Recebimentos.";
  }

  revalidatePath("/admin/financeiro");
  revalidatePath("/admin/financeiro/recebimentos");
  return sucesso({ avisoNota });
}

/**
 * Exclui uma cobrança ainda EM ABERTO (pendente/vencida). Recusa apagar uma
 * já recebida (pago) — isso distorceria o financeiro. Admin apenas.
 */
export async function excluirPagamento(
  pagamentoId: string,
): Promise<ResultadoAcao> {
  await assertPapel(["admin"]);
  const supabase = await createClient();

  const { data: pagamento } = await supabase
    .from("pagamentos")
    .select("id, aluno_id, status")
    .eq("id", pagamentoId)
    .maybeSingle();

  if (!pagamento) return falha("Cobrança não encontrada.");
  if (pagamento.status === "pago") {
    return falha("Não é possível excluir uma cobrança já recebida.");
  }

  const { error } = await supabase
    .from("pagamentos")
    .delete()
    .eq("id", pagamentoId);
  if (error) return falha("Não foi possível excluir a cobrança.");

  revalidatePath("/admin/financeiro");
  if (pagamento.aluno_id) {
    revalidatePath(`/admin/alunos/${pagamento.aluno_id}`);
  }
  return sucesso();
}

// ---------------------------------------------------------------------------
// Despesas
// ---------------------------------------------------------------------------
export async function criarDespesa(input: DespesaInput): Promise<ResultadoAcao> {
  const usuario = await assertPapel(["admin"]);
  const parsed = despesaSchema.safeParse(input);
  if (!parsed.success) {
    return falha(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("despesas").insert({
    descricao: parsed.data.descricao,
    categoria_id: parsed.data.categoria_id ?? null,
    valor: parsed.data.valor,
    data: parsed.data.data,
    criado_por: usuario.id,
  });
  if (error) return falha("Não foi possível lançar a despesa.");

  revalidatePath("/admin/financeiro");
  return sucesso();
}

export async function excluirDespesa(id: string): Promise<ResultadoAcao> {
  await assertPapel(["admin"]);
  const supabase = await createClient();
  const { error } = await supabase.from("despesas").delete().eq("id", id);
  if (error) return falha("Não foi possível excluir a despesa.");

  revalidatePath("/admin/financeiro");
  return sucesso();
}
