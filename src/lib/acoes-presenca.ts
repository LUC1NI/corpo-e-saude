"use server";

import { revalidatePath } from "next/cache";

import { assertPapel } from "@/lib/auth";
import { falha, sucesso, type ResultadoAcao } from "@/lib/acoes";
import { getProfessorAtual } from "@/lib/professor";
import { horarioSchema, type HorarioInput } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Horários (grade do professor)
// ---------------------------------------------------------------------------
export async function criarHorario(
  input: HorarioInput,
): Promise<ResultadoAcao> {
  await assertPapel(["professor"]);
  const professor = await getProfessorAtual();
  if (!professor) return falha("Professor não encontrado.");

  const parsed = horarioSchema.safeParse(input);
  if (!parsed.success) {
    return falha(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("horarios").insert({
    professor_id: professor.id,
    dia_semana: parsed.data.dia_semana,
    hora_inicio: parsed.data.hora_inicio,
    hora_fim: parsed.data.hora_fim,
    capacidade: parsed.data.capacidade ?? null,
  });
  if (error) return falha("Não foi possível criar o horário.");

  revalidatePath("/professor/horarios");
  return sucesso();
}

export async function excluirHorario(id: string): Promise<ResultadoAcao> {
  await assertPapel(["professor"]);
  const supabase = await createClient();
  const { error } = await supabase.from("horarios").delete().eq("id", id);
  if (error) return falha("Não foi possível excluir o horário.");

  revalidatePath("/professor/horarios");
  return sucesso();
}

// ---------------------------------------------------------------------------
// Presença (marcação por dia / horário)
// ---------------------------------------------------------------------------
export async function marcarPresenca(
  alunoId: string,
  data: string,
  hora: string | null,
): Promise<ResultadoAcao> {
  await assertPapel(["professor"]);
  const professor = await getProfessorAtual();
  if (!professor) return falha("Professor não encontrado.");

  const supabase = await createClient();
  const { error } = await supabase.from("presencas").insert({
    aluno_id: alunoId,
    professor_id: professor.id,
    data,
    hora,
  });
  if (error) return falha("Não foi possível registrar a presença.");

  revalidatePath("/professor/presenca");
  revalidatePath("/professor/horarios");
  return sucesso();
}

export async function removerPresenca(id: string): Promise<ResultadoAcao> {
  await assertPapel(["professor"]);
  const supabase = await createClient();
  const { error } = await supabase.from("presencas").delete().eq("id", id);
  if (error) return falha("Não foi possível remover a presença.");

  revalidatePath("/professor/presenca");
  revalidatePath("/professor/horarios");
  return sucesso();
}

/**
 * Alterna a presença de um aluno em uma data (e opcionalmente um horário):
 * cria se não existir, remove se já existir. Base do roster diário.
 */
export async function alternarPresenca(
  alunoId: string,
  data: string,
  hora: string | null,
): Promise<ResultadoAcao<{ presente: boolean }>> {
  await assertPapel(["professor"]);
  const professor = await getProfessorAtual();
  if (!professor) return falha("Professor não encontrado.");

  const supabase = await createClient();

  let consulta = supabase
    .from("presencas")
    .select("id")
    .eq("aluno_id", alunoId)
    .eq("data", data)
    .eq("professor_id", professor.id);
  consulta = hora ? consulta.eq("hora", hora) : consulta.is("hora", null);

  const { data: existente } = await consulta.maybeSingle();

  if (existente) {
    const { error } = await supabase
      .from("presencas")
      .delete()
      .eq("id", existente.id);
    if (error) return falha("Não foi possível atualizar a presença.");
    revalidatePath("/professor/presenca");
    revalidatePath("/professor/horarios");
    return sucesso({ presente: false });
  }

  const { error } = await supabase.from("presencas").insert({
    aluno_id: alunoId,
    professor_id: professor.id,
    data,
    hora,
  });
  if (error) return falha("Não foi possível registrar a presença.");
  revalidatePath("/professor/presenca");
  revalidatePath("/professor/horarios");
  return sucesso({ presente: true });
}
