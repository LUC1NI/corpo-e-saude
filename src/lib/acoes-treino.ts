"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

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
import { avisarTreinoAtualizado } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Revalida as telas afetadas por uma mudança de treino. `alunoId` null indica
 * edição de um treino-modelo (aba Treinos), sem página de aluno envolvida.
 */
function revalidarAluno(alunoId: string | null) {
  if (alunoId) {
    revalidatePath(`/admin/alunos/${alunoId}`);
    revalidatePath(`/professor/alunos/${alunoId}`);
    revalidatePath("/aluno/treino");
    // Push "treino atualizado" (só aluno online). Roda depois da resposta,
    // sem atrasar quem está editando a ficha.
    after(() => avisarTreinoAtualizado(createAdminClient(), alunoId));
  }
  revalidarBiblioteca();
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

/**
 * Garante UMA ficha ativa por aluno: ao ativar uma, desativa as demais.
 * Sem isso o "treino de hoje" do aluno fica ambíguo (duas fichas ativas).
 */
async function desativarOutrasFichas(
  supabase: Awaited<ReturnType<typeof createClient>>,
  alunoId: string,
  mantemId: string,
) {
  await supabase
    .from("treinos")
    .update({ ativo: false })
    .eq("aluno_id", alunoId)
    .eq("ativo", true)
    .neq("id", mantemId);
}

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
  if (d.ativo) await desativarOutrasFichas(supabase, alunoId, data.id as string);

  revalidarAluno(alunoId);
  return sucesso({ id: data.id as string });
}

export async function atualizarTreino(
  id: string,
  alunoId: string | null,
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
  if (d.ativo && alunoId) await desativarOutrasFichas(supabase, alunoId, id);

  revalidarAluno(alunoId);
  return sucesso();
}

export async function excluirTreino(
  id: string,
  alunoId: string | null,
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
  alunoId: string | null,
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
  alunoId: string | null,
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
  alunoId: string | null,
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
  alunoId: string | null,
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
  alunoId: string | null,
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
  alunoId: string | null,
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
// Atalho "montar treino": ficha ativa + divisão A criadas de uma vez, levando
// o professor direto à etapa que importa (adicionar os exercícios).
// ===========================================================================
export async function criarTreinoRapido(
  alunoId: string,
): Promise<ResultadoAcao<{ id: string }>> {
  await assertPapel(["admin", "professor"]);

  const professor = await getProfessorAtual();
  const supabase = await createClient();

  const { data: treino, error } = await supabase
    .from("treinos")
    .insert({
      aluno_id: alunoId,
      professor_id: professor?.id ?? null,
      nome: "Ficha de treino",
      objetivo: null,
      ativo: true,
    })
    .select("id")
    .single();
  if (error || !treino) return falha("Não foi possível criar a ficha.");
  await desativarOutrasFichas(supabase, alunoId, treino.id as string);

  const { error: eD } = await supabase.from("treino_divisoes").insert({
    treino_id: treino.id,
    nome: "A",
    foco: null,
    dias_semana: [],
    ordem: 0,
  });
  if (eD) return falha("Ficha criada, mas a divisão A falhou. Adicione-a manualmente.");

  revalidarAluno(alunoId);
  return sucesso({ id: treino.id as string });
}

// ===========================================================================
// Treinos-modelo (reutilizáveis): montados na aba Treinos e aplicados a
// qualquer aluno com um clique — a aplicação copia divisões e exercícios,
// então a ficha do aluno fica independente e pode ser ajustada à vontade.
// ===========================================================================
export async function criarModeloTreino(
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
      aluno_id: null,
      professor_id: professor?.id ?? null,
      nome: d.nome,
      objetivo: d.objetivo ?? null,
      ativo: d.ativo,
      modelo: true,
    })
    .select("id")
    .single();
  if (error || !data) return falha("Não foi possível criar o treino.");

  revalidarBiblioteca();
  return sucesso({ id: data.id as string });
}

export async function aplicarModeloAoAluno(
  modeloId: string,
  alunoId: string,
): Promise<ResultadoAcao<{ id: string }>> {
  await assertPapel(["admin", "professor"]);

  const supabase = await createClient();

  // Lê o modelo completo (RLS: todo professor enxerga os modelos do studio).
  const { data: modeloData } = await supabase
    .from("treinos")
    .select(
      `nome, objetivo,
       treino_divisoes (
         nome, foco, ordem, dias_semana,
         treino_exercicios (
           exercicio_id, series, repeticoes, carga, descanso, ordem, observacao
         )
       )`,
    )
    .eq("id", modeloId)
    .eq("modelo", true)
    .maybeSingle();
  if (!modeloData) return falha("Treino não encontrado.");

  const modelo = modeloData as unknown as {
    nome: string;
    objetivo: string | null;
    treino_divisoes: {
      nome: string;
      foco: string | null;
      ordem: number;
      dias_semana: number[] | null;
      treino_exercicios: {
        exercicio_id: string;
        series: number | null;
        repeticoes: string | null;
        carga: string | null;
        descanso: string | null;
        ordem: number;
        observacao: string | null;
      }[];
    }[];
  };

  const professor = await getProfessorAtual();

  // Cria a ficha do aluno (o RLS valida o vínculo professor × aluno).
  const { data: ficha, error: eT } = await supabase
    .from("treinos")
    .insert({
      aluno_id: alunoId,
      professor_id: professor?.id ?? null,
      nome: modelo.nome,
      objetivo: modelo.objetivo,
      ativo: true,
    })
    .select("id")
    .single();
  if (eT || !ficha) return falha("Não foi possível criar a ficha do aluno.");
  await desativarOutrasFichas(supabase, alunoId, ficha.id as string);

  // Copia divisões e exercícios.
  for (const div of [...modelo.treino_divisoes].sort(
    (a, b) => a.ordem - b.ordem,
  )) {
    const { data: divisao, error: eD } = await supabase
      .from("treino_divisoes")
      .insert({
        treino_id: ficha.id,
        nome: div.nome,
        foco: div.foco,
        dias_semana: div.dias_semana ?? [],
        ordem: div.ordem,
      })
      .select("id")
      .single();
    if (eD || !divisao) continue;

    const linhas = div.treino_exercicios.map((e) => ({
      divisao_id: divisao.id,
      exercicio_id: e.exercicio_id,
      series: e.series,
      repeticoes: e.repeticoes,
      carga: e.carga,
      descanso: e.descanso,
      observacao: e.observacao,
      ordem: e.ordem,
    }));
    if (linhas.length) {
      await supabase.from("treino_exercicios").insert(linhas);
    }
  }

  revalidarAluno(alunoId);
  return sucesso({ id: ficha.id as string });
}

const ajusteSchema = z.discriminatedUnion("campo", [
  z.object({
    campo: z.literal("series"),
    valor: z.preprocess(
      (v) => (v === "" ? null : v),
      z.coerce.number({ message: "Séries deve ser um número." }).int().positive("Séries deve ser maior que zero.").max(50).nullable(),
    ),
  }),
  z.object({
    campo: z.enum(["repeticoes", "carga", "descanso"]),
    valor: z.string().trim().max(40).transform((v) => v || null),
  }),
]);

/**
 * Ajuste rápido de UM campo da prescrição (edição na tabela). Grava só o
 * campo alterado, para dois ajustes seguidos não desfazerem um ao outro.
 */
export async function ajustarTreinoExercicio(
  id: string,
  alunoId: string | null,
  campo: "series" | "repeticoes" | "carga" | "descanso",
  valor: string,
): Promise<ResultadoAcao> {
  await assertPapel(["admin", "professor"]);
  const parsed = ajusteSchema.safeParse({ campo, valor });
  if (!parsed.success || !z.string().uuid().safeParse(id).success) {
    return falha(parsed.error?.issues[0]?.message ?? "Dados inválidos.");
  }

  const supabase = await createClient();
  // RLS barra exercício de aluno de outro professor: aí nenhuma linha volta.
  const { data, error } = await supabase
    .from("treino_exercicios")
    .update({ [parsed.data.campo]: parsed.data.valor })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return falha("Não foi possível salvar o ajuste.");

  revalidarAluno(alunoId);
  return sucesso();
}
