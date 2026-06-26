"use server";

import { revalidatePath } from "next/cache";

import { assertPapel } from "@/lib/auth";
import { falha, sucesso, type ResultadoAcao } from "@/lib/acoes";
import { getProfessorAtual } from "@/lib/professor";
import {
  anamneseSchema,
  avaliacaoSchema,
  type AnamneseInput,
  type AvaliacaoInput,
} from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

function revalidarAluno(alunoId: string) {
  revalidatePath(`/admin/alunos/${alunoId}`);
  revalidatePath(`/professor/alunos/${alunoId}`);
}

// ---------------------------------------------------------------------------
// Anamnese (uma por aluno — upsert)
// ---------------------------------------------------------------------------
export async function salvarAnamnese(
  alunoId: string,
  input: AnamneseInput,
): Promise<ResultadoAcao> {
  await assertPapel(["admin", "professor"]);
  const parsed = anamneseSchema.safeParse(input);
  if (!parsed.success) {
    return falha(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const professor = await getProfessorAtual();
  const supabase = await createClient();
  const { error } = await supabase.from("anamneses").upsert(
    {
      aluno_id: alunoId,
      historico_saude: parsed.data.historico_saude ?? null,
      lesoes_restricoes: parsed.data.lesoes_restricoes ?? null,
      medicacao: parsed.data.medicacao ?? null,
      objetivos: parsed.data.objetivos ?? null,
      rotina_disponibilidade: parsed.data.rotina_disponibilidade ?? null,
      nivel_atividade: parsed.data.nivel_atividade ?? null,
      criado_por: professor?.id ?? null,
    },
    { onConflict: "aluno_id" },
  );
  if (error) return falha("Não foi possível salvar a anamnese.");

  revalidarAluno(alunoId);
  return sucesso();
}

// ---------------------------------------------------------------------------
// Avaliação física (histórico)
// ---------------------------------------------------------------------------
export async function criarAvaliacao(
  alunoId: string,
  input: AvaliacaoInput,
): Promise<ResultadoAcao> {
  await assertPapel(["admin", "professor"]);
  const parsed = avaliacaoSchema.safeParse(input);
  if (!parsed.success) {
    return falha(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const d = parsed.data;
  const medidas: Record<string, number> = {};
  for (const campo of ["cintura", "quadril", "braco", "coxa", "peitoral"] as const) {
    const v = d[campo];
    if (typeof v === "number") medidas[campo] = v;
  }

  const professor = await getProfessorAtual();
  const supabase = await createClient();
  const { error } = await supabase.from("avaliacoes_fisicas").insert({
    aluno_id: alunoId,
    data: d.data,
    peso: d.peso ?? null,
    altura: d.altura ?? null,
    percentual_gordura: d.percentual_gordura ?? null,
    medidas,
    observacoes: d.observacoes ?? null,
    criado_por: professor?.id ?? null,
  });
  if (error) return falha("Não foi possível salvar a avaliação.");

  revalidarAluno(alunoId);
  return sucesso();
}

export async function excluirAvaliacao(
  id: string,
  alunoId: string,
): Promise<ResultadoAcao> {
  await assertPapel(["admin", "professor"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("avaliacoes_fisicas")
    .delete()
    .eq("id", id);
  if (error) return falha("Não foi possível excluir a avaliação.");

  revalidarAluno(alunoId);
  return sucesso();
}
