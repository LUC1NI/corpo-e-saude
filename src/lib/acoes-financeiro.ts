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
import { createClient } from "@/lib/supabase/server";
import { executarRenovacao } from "@/lib/renovacao";
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

  // Primeiro pagamento (referente ao período inicial).
  const { error: errPag } = await supabase.from("pagamentos").insert({
    matricula_id: matricula.id,
    aluno_id: alunoId,
    competencia: competenciaDe(parsed.data.data_inicio),
    valor: plano.valor,
    vencimento: parsed.data.data_inicio,
    status: "pendente",
  });
  if (errPag) return falha("Matrícula criada, mas falhou ao gerar a cobrança.");

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
// Renovação automática — gera cobranças vencidas e marca inadimplência
// (rodada manual pelo dono; no go-live vira um cron — ver passo 10)
// ---------------------------------------------------------------------------
export async function gerarCobrancasPendentes(): Promise<
  ResultadoAcao<{ geradas: number }>
> {
  await assertPapel(["admin"]);
  const supabase = await createClient();
  try {
    const { geradas } = await executarRenovacao(supabase);
    revalidatePath("/admin/financeiro");
    return sucesso({ geradas });
  } catch {
    return falha("Não foi possível gerar as cobranças.");
  }
}

// ---------------------------------------------------------------------------
// Baixa de pagamento (recebimento)
// ---------------------------------------------------------------------------
export async function marcarPagamentoPago(
  pagamentoId: string,
  formaPagamento?: string,
): Promise<ResultadoAcao> {
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

  revalidatePath("/admin/financeiro");
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
