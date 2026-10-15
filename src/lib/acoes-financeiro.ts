"use server";

import { revalidatePath } from "next/cache";

import { assertPapel } from "@/lib/auth";
import { falha, sucesso, type ResultadoAcao } from "@/lib/acoes";
import { format, isValid, parseISO, subDays } from "date-fns";
import {
  competenciaDe,
  hojeISO,
  proximaCobranca,
} from "@/lib/financeiro";
import { z } from "zod";

import {
  baixaSchema,
  despesaSchema,
  matriculaSchema,
  type BaixaInput,
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

  if (existente) {
    // Troca de plano no mesmo mês: a cobrança ainda em aberto passa a ser
    // da matrícula nova, com o valor novo (paga fica como está).
    await supabase
      .from("pagamentos")
      .update({ matricula_id: matricula.id, valor: plano.valor })
      .eq("id", existente.id)
      .in("status", ["pendente", "vencido"]);
  } else {
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
  const ids = z.array(z.string().uuid()).safeParse([matriculaId, alunoId]);
  if (!ids.success) return falha("Dados inválidos.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("matriculas")
    .update({ status: "cancelada" })
    .eq("id", matriculaId);
  if (error) return falha("Não foi possível cancelar a matrícula.");

  // A renovação gera a cobrança alguns dias antes do vencimento: ao cancelar,
  // a cobrança ainda não vencida desta matrícula deixa de existir (senão
  // viraria "atraso" de um mês que o aluno não vai usar).
  await supabase
    .from("pagamentos")
    .delete()
    .eq("matricula_id", matriculaId)
    .eq("status", "pendente")
    .gte("vencimento", hojeISO());

  revalidatePath(`/admin/alunos/${alunoId}`);
  revalidatePath("/admin/financeiro");
  return sucesso();
}

// ---------------------------------------------------------------------------
// Baixa de pagamento (recebimento)
// ---------------------------------------------------------------------------
export async function marcarPagamentoPago(
  input: BaixaInput,
): Promise<ResultadoAcao<{ avisoNota?: string }>> {
  await assertPapel(["admin"]);
  const parsed = baixaSchema.safeParse(input);
  if (!parsed.success) {
    return falha(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { pagamentoId, forma, data } = parsed.data;
  const hoje = hojeISO();
  if (!isValid(parseISO(data))) return falha("Data do pagamento inválida.");
  if (data > hoje) return falha("A data do pagamento não pode ser no futuro.");
  // Erro de digitação (ex.: ano errado) jogaria o recebimento num mês fechado.
  if (data < format(subDays(parseISO(hoje), 90), "yyyy-MM-dd")) {
    return falha("Data muito antiga. Confira o dia do pagamento.");
  }

  const supabase = await createClient();
  const { data: existe } = await supabase
    .from("pagamentos")
    .select("status")
    .eq("id", pagamentoId)
    .maybeSingle();
  if (!existe) return falha("Mensalidade não encontrada.");
  if (existe.status === "pago") return falha("Esta mensalidade já estava paga.");

  const { data: atualizado, error } = await supabase
    .from("pagamentos")
    .update({ status: "pago", data_pagamento: data, forma_pagamento: forma ?? null })
    .eq("id", pagamentoId)
    .neq("status", "pago")
    .select("aluno_id")
    .maybeSingle();
  if (error) return falha("Não foi possível dar baixa no pagamento.");
  if (!atualizado) return falha("Esta mensalidade já estava paga.");

  // Nota fiscal depois da baixa. A baixa NUNCA falha por causa da nota:
  // qualquer problema vira status/mensagem na própria nota.
  let avisoNota: string | undefined;
  try {
    const config = await carregarConfigFiscal(supabase);
    if (config?.emitir_automaticamente_na_baixa) {
      const r = await emitirNotaDoPagamento(supabase, pagamentoId);
      // "Aguardando configuração" é o estado normal sem token: não incomoda o
      // dono. Erro (ou nota nem registrada) precisa aparecer.
      if (r.status === null || r.status === "erro") avisoNota = r.mensagem;
    }
  } catch {
    avisoNota = "Pagamento confirmado, mas a nota não foi gerada. Emita em Recebimentos.";
  }

  revalidarFinanceiro(atualizado.aluno_id as string);
  return sucesso({ avisoNota });
}

/**
 * Desfaz uma baixa feita por engano: a mensalidade volta a ficar em aberto.
 * Recusa se a nota fiscal já foi autorizada/está em processamento (nesse caso
 * é preciso cancelar a nota primeiro). Nota ainda não emitida é cancelada.
 */
export async function desfazerBaixa(pagamentoId: string): Promise<ResultadoAcao> {
  await assertPapel(["admin"]);
  const id = z.string().uuid().safeParse(pagamentoId);
  if (!id.success) return falha("Pagamento inválido.");
  const supabase = await createClient();

  const [{ data: pagamento }, { data: notas }] = await Promise.all([
    supabase.from("pagamentos").select("aluno_id, vencimento, status").eq("id", id.data).maybeSingle(),
    supabase
      .from("notas_fiscais")
      .select("id, status")
      .eq("pagamento_id", id.data)
      .neq("status", "cancelada"),
  ]);
  if (!pagamento || pagamento.status !== "pago") return falha("Nada para desfazer.");
  const nota = (notas ?? [])[0] as { id: string; status: string } | undefined;
  // Só desfaz se a nota ainda NÃO foi enviada à prefeitura. "erro" pode ser
  // timeout com nota autorizada do outro lado: exige conferir em Nota fiscal.
  if (nota && nota.status !== "aguardando_configuracao") {
    return falha("Esta mensalidade já tem nota fiscal enviada. Resolva a nota em Nota fiscal antes de desfazer.");
  }

  // 1º trava a nota pendente (só se continuar aguardando: se o emissor andou,
  // não desfaz). Depois reverte o pagamento, condicionado a ainda estar pago.
  if (nota) {
    const { data: travada } = await supabase
      .from("notas_fiscais")
      .update({
        status: "cancelada",
        justificativa_cancelamento: "Baixa desfeita antes da emissão.",
        cancelada_em: new Date().toISOString(),
      })
      .eq("id", nota.id)
      .eq("status", "aguardando_configuracao")
      .select("id")
      .maybeSingle();
    if (!travada) return falha("A nota fiscal mudou agora há pouco. Confira em Nota fiscal.");
  }

  const { data: revertido, error } = await supabase
    .from("pagamentos")
    .update({
      status: (pagamento.vencimento as string) < hojeISO() ? "vencido" : "pendente",
      data_pagamento: null,
      forma_pagamento: null,
    })
    .eq("id", id.data)
    .eq("status", "pago")
    .select("id")
    .maybeSingle();
  if (error || !revertido) return falha("Não foi possível desfazer.");

  revalidarFinanceiro(pagamento.aluno_id as string);
  return sucesso();
}

function revalidarFinanceiro(alunoId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/financeiro", "layout");
  revalidatePath(`/admin/alunos/${alunoId}`);
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
