"use server";

import { revalidatePath } from "next/cache";

import { assertPapel } from "@/lib/auth";
import { falha, sucesso, type ResultadoAcao } from "@/lib/acoes";
import { getProfessorAtual } from "@/lib/professor";
import {
  divisaoSchema,
  exercicioSchema,
  treinoExercicioSchema,
  treinoSchema,
  type DivisaoInput,
  type ExercicioInput,
  type TreinoExercicioInput,
  type TreinoInput,
} from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";
import { getTemplate } from "@/lib/templates-treino";

function revalidarAluno(alunoId: string) {
  revalidatePath(`/admin/alunos/${alunoId}`);
  revalidatePath(`/professor/alunos/${alunoId}`);
}

function revalidarBiblioteca() {
  revalidatePath("/admin/treinos");
  revalidatePath("/professor/treinos");
}

// ===========================================================================
// Biblioteca de exercícios (admin + professor; RLS libera escrita aos dois)
// ===========================================================================
export async function criarExercicio(
  input: ExercicioInput,
): Promise<ResultadoAcao<{ id: string }>> {
  await assertPapel(["admin", "professor"]);
  const parsed = exercicioSchema.safeParse(input);
  if (!parsed.success) {
    return falha(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const d = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercicios")
    .insert({
      nome: d.nome,
      grupo_muscular: d.grupo_muscular ?? null,
      equipamento: d.equipamento ?? null,
      descricao: d.descricao ?? null,
      midia_url: d.midia_url ?? null,
    })
    .select("id")
    .single();
  if (error || !data) return falha("Não foi possível criar o exercício.");

  revalidarBiblioteca();
  return sucesso({ id: data.id as string });
}

export async function atualizarExercicio(
  id: string,
  input: ExercicioInput,
): Promise<ResultadoAcao> {
  await assertPapel(["admin", "professor"]);
  const parsed = exercicioSchema.safeParse(input);
  if (!parsed.success) {
    return falha(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("exercicios")
    .update({
      nome: d.nome,
      grupo_muscular: d.grupo_muscular ?? null,
      equipamento: d.equipamento ?? null,
      descricao: d.descricao ?? null,
      midia_url: d.midia_url ?? null,
    })
    .eq("id", id);
  if (error) return falha("Não foi possível salvar o exercício.");

  revalidarBiblioteca();
  return sucesso();
}

export async function excluirExercicio(id: string): Promise<ResultadoAcao> {
  await assertPapel(["admin", "professor"]);
  const supabase = await createClient();
  const { error } = await supabase.from("exercicios").delete().eq("id", id);
  if (error) {
    // FK on delete restrict: exercício em uso por alguma ficha.
    return falha(
      "Não foi possível excluir: o exercício está em uso em alguma ficha.",
    );
  }

  revalidarBiblioteca();
  return sucesso();
}

// ===========================================================================
// Fichas de treino (por aluno) — RLS escopa ao professor responsável
// ===========================================================================
export async function criarTreino(
  alunoId: string,
  input: TreinoInput,
): Promise<ResultadoAcao<{ id: string }>> {
  await assertPapel(["admin", "professor"]);
  const parsed = treinoSchema.safeParse(input);
  if (!parsed.success) {
    return falha(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const d = parsed.data;
  const professor = await getProfessorAtual();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("treinos")
    .insert({
      aluno_id: alunoId,
      professor_id: professor?.id ?? null,
      nome: d.nome,
      objetivo: d.objetivo ?? null,
      ativo: d.ativo,
    })
    .select("id")
    .single();
  if (error || !data) return falha("Não foi possível criar a ficha.");

  revalidarAluno(alunoId);
  return sucesso({ id: data.id as string });
}

export async function atualizarTreino(
  id: string,
  alunoId: string,
  input: TreinoInput,
): Promise<ResultadoAcao> {
  await assertPapel(["admin", "professor"]);
  const parsed = treinoSchema.safeParse(input);
  if (!parsed.success) {
    return falha(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("treinos")
    .update({
      nome: d.nome,
      objetivo: d.objetivo ?? null,
      ativo: d.ativo,
    })
    .eq("id", id);
  if (error) return falha("Não foi possível salvar a ficha.");

  revalidarAluno(alunoId);
  return sucesso();
}

export async function excluirTreino(
  id: string,
  alunoId: string,
): Promise<ResultadoAcao> {
  await assertPapel(["admin", "professor"]);
  const supabase = await createClient();
  const { error } = await supabase.from("treinos").delete().eq("id", id);
  if (error) return falha("Não foi possível excluir a ficha.");

  revalidarAluno(alunoId);
  return sucesso();
}

// ===========================================================================
// Divisões (A/B/C)
// ===========================================================================
export async function criarDivisao(
  treinoId: string,
  alunoId: string,
  input: DivisaoInput,
  ordem: number,
): Promise<ResultadoAcao<{ id: string }>> {
  await assertPapel(["admin", "professor"]);
  const parsed = divisaoSchema.safeParse(input);
  if (!parsed.success) {
    return falha(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const d = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("treino_divisoes")
    .insert({
      treino_id: treinoId,
      nome: d.nome,
      foco: d.foco ?? null,
      dias_semana: d.dias_semana,
      ordem,
    })
    .select("id")
    .single();
  if (error || !data) return falha("Não foi possível criar a divisão.");

  revalidarAluno(alunoId);
  return sucesso({ id: data.id as string });
}

export async function atualizarDivisao(
  id: string,
  alunoId: string,
  input: DivisaoInput,
): Promise<ResultadoAcao> {
  await assertPapel(["admin", "professor"]);
  const parsed = divisaoSchema.safeParse(input);
  if (!parsed.success) {
    return falha(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("treino_divisoes")
    .update({ nome: d.nome, foco: d.foco ?? null, dias_semana: d.dias_semana })
    .eq("id", id);
  if (error) return falha("Não foi possível salvar a divisão.");

  revalidarAluno(alunoId);
  return sucesso();
}

export async function excluirDivisao(
  id: string,
  alunoId: string,
): Promise<ResultadoAcao> {
  await assertPapel(["admin", "professor"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("treino_divisoes")
    .delete()
    .eq("id", id);
  if (error) return falha("Não foi possível excluir a divisão.");

  revalidarAluno(alunoId);
  return sucesso();
}

// ===========================================================================
// Exercícios dentro de uma divisão (prescrição)
// ===========================================================================
export async function adicionarTreinoExercicio(
  divisaoId: string,
  alunoId: string,
  input: TreinoExercicioInput,
  ordem: number,
): Promise<ResultadoAcao> {
  await assertPapel(["admin", "professor"]);
  const parsed = treinoExercicioSchema.safeParse(input);
  if (!parsed.success) {
    return falha(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("treino_exercicios").insert({
    divisao_id: divisaoId,
    exercicio_id: d.exercicio_id,
    series: d.series ?? null,
    repeticoes: d.repeticoes ?? null,
    carga: d.carga ?? null,
    descanso: d.descanso ?? null,
    observacao: d.observacao ?? null,
    ordem,
  });
  if (error) return falha("Não foi possível adicionar o exercício.");

  revalidarAluno(alunoId);
  return sucesso();
}

export async function atualizarTreinoExercicio(
  id: string,
  alunoId: string,
  input: TreinoExercicioInput,
): Promise<ResultadoAcao> {
  await assertPapel(["admin", "professor"]);
  const parsed = treinoExercicioSchema.safeParse(input);
  if (!parsed.success) {
    return falha(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("treino_exercicios")
    .update({
      exercicio_id: d.exercicio_id,
      series: d.series ?? null,
      repeticoes: d.repeticoes ?? null,
      carga: d.carga ?? null,
      descanso: d.descanso ?? null,
      observacao: d.observacao ?? null,
    })
    .eq("id", id);
  if (error) return falha("Não foi possível salvar o exercício.");

  revalidarAluno(alunoId);
  return sucesso();
}

export async function removerTreinoExercicio(
  id: string,
  alunoId: string,
): Promise<ResultadoAcao> {
  await assertPapel(["admin", "professor"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("treino_exercicios")
    .delete()
    .eq("id", id);
  if (error) return falha("Não foi possível remover o exercício.");

  revalidarAluno(alunoId);
  return sucesso();
}

// ===========================================================================
// Aplicar um modelo (template) de treino a um aluno — gera a ficha pronta
// ===========================================================================
export async function aplicarTemplate(
  alunoId: string,
  templateId: string,
): Promise<ResultadoAcao<{ id: string }>> {
  await assertPapel(["admin", "professor"]);
  const template = getTemplate(templateId);
  if (!template) return falha("Modelo não encontrado.");

  const professor = await getProfessorAtual();
  const supabase = await createClient();

  // Casa os exercícios do modelo com a biblioteca (por nome).
  const nomes = [
    ...new Set(
      template.divisoes.flatMap((d) => d.exercicios.map((e) => e.nome)),
    ),
  ];
  const { data: existentes } = await supabase
    .from("exercicios")
    .select("id, nome")
    .in("nome", nomes);
  const mapa = new Map(
    ((existentes ?? []) as { id: string; nome: string }[]).map((e) => [
      e.nome,
      e.id,
    ]),
  );

  // Cria a ficha.
  const { data: treino, error: eT } = await supabase
    .from("treinos")
    .insert({
      aluno_id: alunoId,
      professor_id: professor?.id ?? null,
      nome: template.nome,
      objetivo: template.objetivo,
      ativo: true,
    })
    .select("id")
    .single();
  if (eT || !treino) return falha("Não foi possível criar a ficha do modelo.");

  // Cria divisões e exercícios.
  let ordemDiv = 0;
  for (const div of template.divisoes) {
    const { data: divisao, error: eD } = await supabase
      .from("treino_divisoes")
      .insert({
        treino_id: treino.id,
        nome: div.nome,
        foco: div.foco,
        dias_semana: div.dias_semana,
        ordem: ordemDiv++,
      })
      .select("id")
      .single();
    if (eD || !divisao) continue;

    const linhas = div.exercicios
      .map((item, i) => {
        const exId = mapa.get(item.nome);
        if (!exId) return null;
        return {
          divisao_id: divisao.id,
          exercicio_id: exId,
          series: item.series ?? null,
          repeticoes: item.repeticoes ?? null,
          descanso: item.descanso ?? null,
          ordem: i,
        };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);

    if (linhas.length) {
      await supabase.from("treino_exercicios").insert(linhas);
    }
  }

  revalidarAluno(alunoId);
  return sucesso({ id: treino.id as string });
}
