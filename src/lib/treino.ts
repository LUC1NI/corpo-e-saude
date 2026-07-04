import { createClient } from "@/lib/supabase/server";
import type { Exercicio, TreinoComTudo } from "@/lib/tipos";

/** Select aninhado usado tanto para fichas de aluno quanto para modelos. */
const SELECT_TREINO_COMPLETO = `id, aluno_id, professor_id, nome, objetivo, ativo, criado_em, atualizado_em,
  treino_divisoes (
    id, treino_id, nome, foco, ordem, dias_semana,
    treino_exercicios (
      id, divisao_id, exercicio_id, series, repeticoes, carga, descanso, ordem, observacao,
      exercicios ( nome, grupo_muscular, midia_url )
    )
  )`;

/** Linha bruta retornada pelo select aninhado (embeds vêm como arrays). */
interface TreinoRow {
  id: string;
  aluno_id: string | null;
  professor_id: string | null;
  nome: string;
  objetivo: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  treino_divisoes: {
    id: string;
    treino_id: string;
    nome: string;
    foco: string | null;
    ordem: number;
    dias_semana: number[] | null;
    treino_exercicios: {
      id: string;
      divisao_id: string;
      exercicio_id: string;
      series: number | null;
      repeticoes: string | null;
      carga: string | null;
      descanso: string | null;
      ordem: number;
      observacao: string | null;
      exercicios: {
        nome: string;
        grupo_muscular: string | null;
        midia_url: string | null;
      } | null;
    }[];
  }[];
}

function mapTreino(t: TreinoRow): TreinoComTudo {
  return {
    id: t.id,
    aluno_id: t.aluno_id,
    professor_id: t.professor_id,
    nome: t.nome,
    objetivo: t.objetivo,
    ativo: t.ativo,
    criado_em: t.criado_em,
    atualizado_em: t.atualizado_em,
    divisoes: [...t.treino_divisoes]
      .sort((a, b) => a.ordem - b.ordem)
      .map((d) => ({
        id: d.id,
        treino_id: d.treino_id,
        nome: d.nome,
        foco: d.foco,
        ordem: d.ordem,
        dias_semana: d.dias_semana ?? [],
        exercicios: [...d.treino_exercicios]
          .sort((a, b) => a.ordem - b.ordem)
          .map((e) => ({
            id: e.id,
            divisao_id: e.divisao_id,
            exercicio_id: e.exercicio_id,
            series: e.series,
            repeticoes: e.repeticoes,
            carga: e.carga,
            descanso: e.descanso,
            ordem: e.ordem,
            observacao: e.observacao,
            exercicio: e.exercicios,
          })),
      })),
  };
}

/**
 * Carrega as fichas de treino de um aluno com divisões e exercícios já
 * ordenados. O RLS garante o escopo (professor responsável, aluno, admin).
 */
export async function getTreinosDoAluno(
  alunoId: string,
): Promise<TreinoComTudo[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("treinos")
    .select(SELECT_TREINO_COMPLETO)
    .eq("aluno_id", alunoId)
    .order("ativo", { ascending: false })
    .order("criado_em", { ascending: false });

  return ((data ?? []) as unknown as TreinoRow[]).map(mapTreino);
}

/**
 * Treinos-modelo do studio (reutilizáveis), com divisões e exercícios.
 * Visíveis a todos os professores e ao admin (RLS).
 */
export async function getModelosTreino(): Promise<TreinoComTudo[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("treinos")
    .select(SELECT_TREINO_COMPLETO)
    .eq("modelo", true)
    .order("nome");

  return ((data ?? []) as unknown as TreinoRow[]).map(mapTreino);
}

/** Um treino-modelo específico (ou null se não existir/não for modelo). */
export async function getModeloTreino(
  id: string,
): Promise<TreinoComTudo | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("treinos")
    .select(SELECT_TREINO_COMPLETO)
    .eq("id", id)
    .eq("modelo", true)
    .maybeSingle();

  return data ? mapTreino(data as unknown as TreinoRow) : null;
}

/** Biblioteca de exercícios (para os seletores de prescrição). */
export async function getExerciciosBiblioteca(): Promise<Exercicio[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("exercicios").select("*").order("nome");
  return (data ?? []) as Exercicio[];
}
