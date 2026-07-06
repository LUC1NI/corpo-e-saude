"use server";

import { revalidatePath } from "next/cache";

import { falha, sucesso, type ResultadoAcao } from "@/lib/acoes";
import { getAlunoAtual } from "@/lib/aluno";
import { assertPapel } from "@/lib/auth";
import { execucaoSchema, type ExecucaoInput } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

/**
 * Registra um treino concluído no modo treino do aluno.
 * O RLS garante que o aluno só insere execuções dele mesmo.
 */
export async function registrarExecucao(
  input: ExecucaoInput,
): Promise<ResultadoAcao> {
  await assertPapel(["aluno"]);
  const parsed = execucaoSchema.safeParse(input);
  if (!parsed.success) {
    return falha(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const aluno = await getAlunoAtual();
  if (!aluno) return falha("Cadastro de aluno não encontrado.");

  const d = parsed.data;
  // Exercício "feito" = completou todas as séries previstas (mínimo 1).
  const feitos = d.detalhes.filter(
    (e) => e.series_feitas >= Math.max(e.series, 1),
  ).length;

  const supabase = await createClient();
  const { error } = await supabase.from("treino_execucoes").insert({
    aluno_id: aluno.id,
    divisao_id: d.divisao_id,
    nome_divisao: d.nome_divisao,
    foco_divisao: d.foco_divisao ?? null,
    iniciado_em: d.iniciado_em,
    duracao_segundos: d.duracao_segundos,
    exercicios_previstos: d.detalhes.length,
    exercicios_feitos: feitos,
    detalhes: d.detalhes.map((e) => ({
      nome: e.nome,
      series: e.series,
      series_feitas: e.series_feitas,
      carga: e.carga ?? null,
    })),
    sensacao: d.sensacao ?? null,
    observacao: d.observacao ?? null,
  });
  if (error) return falha("Não foi possível registrar o treino.");

  revalidatePath("/aluno");
  revalidatePath(`/professor/alunos/${aluno.id}`);
  revalidatePath(`/admin/alunos/${aluno.id}`);
  return sucesso();
}
