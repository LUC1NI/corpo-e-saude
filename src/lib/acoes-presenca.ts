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

/**
 * Define quais alunos estão agendados em um horário (substitui o conjunto
 * atual). O RLS garante que só o professor dono do horário e dos alunos
 * consegue gravar. Base para a presença mostrar só os alunos da aula.
 */
export async function definirAlunosDoHorario(
  horarioId: string,
  alunoIds: string[],
): Promise<ResultadoAcao> {
  await assertPapel(["professor"]);
  const professor = await getProfessorAtual();
  if (!professor) return falha("Professor não encontrado.");

  const supabase = await createClient();

  // Confere que o horário é do professor (RLS já cobre, mas evita lixo).
  const { data: horario } = await supabase
    .from("horarios")
    .select("id")
    .eq("id", horarioId)
    .eq("professor_id", professor.id)
    .maybeSingle();
  if (!horario) return falha("Horário não encontrado.");

  // Substitui o conjunto: limpa os atuais e insere os selecionados.
  const { error: errDel } = await supabase
    .from("aluno_horarios")
    .delete()
    .eq("horario_id", horarioId);
  if (errDel) return falha("Não foi possível atualizar os alunos da aula.");

  const unicos = [...new Set(alunoIds)];
  if (unicos.length > 0) {
    const linhas = unicos.map((alunoId) => ({
      horario_id: horarioId,
      aluno_id: alunoId,
    }));
    const { error: errIns } = await supabase
      .from("aluno_horarios")
      .insert(linhas);
    if (errIns) return falha("Não foi possível atribuir os alunos.");
  }

  revalidatePath("/professor/horarios");
  revalidatePath("/professor/presenca");
  return sucesso();
}

/**
 * Cria o mesmo horário em vários dias para o PRÓPRIO professor logado.
 * Pula os dias em que já existe esse horário (não duplica).
 */
export async function criarHorariosProfessor(
  dias: number[],
  horaInicio: string,
  horaFim: string,
  capacidade?: number,
): Promise<ResultadoAcao<{ criados: number; pulados: number }>> {
  await assertPapel(["professor"]);
  const professor = await getProfessorAtual();
  if (!professor) return falha("Professor não encontrado.");

  const diasValidos = [...new Set(dias)].filter(
    (d) => Number.isInteger(d) && d >= 0 && d <= 6,
  );
  if (diasValidos.length === 0) return falha("Selecione ao menos um dia.");

  const base = horarioSchema.safeParse({
    dia_semana: diasValidos[0],
    hora_inicio: horaInicio,
    hora_fim: horaFim,
    capacidade,
  });
  if (!base.success) {
    return falha(base.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const supabase = await createClient();
  const { data: existentes } = await supabase
    .from("horarios")
    .select("dia_semana")
    .eq("professor_id", professor.id)
    .eq("hora_inicio", base.data.hora_inicio)
    .eq("hora_fim", base.data.hora_fim)
    .in("dia_semana", diasValidos);
  const jaTem = new Set(
    ((existentes ?? []) as { dia_semana: number }[]).map((r) => r.dia_semana),
  );

  const aCriar = diasValidos.filter((d) => !jaTem.has(d));
  if (aCriar.length > 0) {
    const { error } = await supabase.from("horarios").insert(
      aCriar.map((d) => ({
        professor_id: professor.id,
        dia_semana: d,
        hora_inicio: base.data.hora_inicio,
        hora_fim: base.data.hora_fim,
        capacidade: base.data.capacidade ?? null,
      })),
    );
    if (error) return falha("Não foi possível criar os horários.");
  }

  revalidatePath("/professor/horarios");
  revalidatePath("/professor/presenca");
  revalidatePath("/professor");
  return sucesso({ criados: aCriar.length, pulados: jaTem.size });
}

// ---------------------------------------------------------------------------
// Horários — gestão pelo admin (para qualquer professor)
// ---------------------------------------------------------------------------
export async function criarHorarioAdmin(
  professorId: string,
  input: HorarioInput,
): Promise<ResultadoAcao> {
  await assertPapel(["admin"]);
  const parsed = horarioSchema.safeParse(input);
  if (!parsed.success) {
    return falha(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const supabase = await createClient();
  const { data: prof } = await supabase
    .from("professores")
    .select("id")
    .eq("id", professorId)
    .maybeSingle();
  if (!prof) return falha("Professor não encontrado.");

  const { error } = await supabase.from("horarios").insert({
    professor_id: professorId,
    dia_semana: parsed.data.dia_semana,
    hora_inicio: parsed.data.hora_inicio,
    hora_fim: parsed.data.hora_fim,
    capacidade: parsed.data.capacidade ?? null,
  });
  if (error) return falha("Não foi possível criar o horário.");

  revalidatePath("/admin/horarios");
  return sucesso();
}

/**
 * Cria o mesmo horário (início/fim/capacidade) em vários dias de uma vez.
 * Pula os dias em que o professor já tem exatamente esse horário (não
 * duplica). Retorna quantos foram criados e quantos foram pulados.
 */
export async function criarHorariosAdmin(
  professorId: string,
  dias: number[],
  horaInicio: string,
  horaFim: string,
  capacidade?: number,
): Promise<ResultadoAcao<{ criados: number; pulados: number }>> {
  await assertPapel(["admin"]);

  const diasValidos = [...new Set(dias)].filter(
    (d) => Number.isInteger(d) && d >= 0 && d <= 6,
  );
  if (diasValidos.length === 0) return falha("Selecione ao menos um dia.");

  const base = horarioSchema.safeParse({
    dia_semana: diasValidos[0],
    hora_inicio: horaInicio,
    hora_fim: horaFim,
    capacidade,
  });
  if (!base.success) {
    return falha(base.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const supabase = await createClient();
  const { data: prof } = await supabase
    .from("professores")
    .select("id")
    .eq("id", professorId)
    .maybeSingle();
  if (!prof) return falha("Professor não encontrado.");

  // Dias em que o professor já tem exatamente esse horário (não duplica).
  const { data: existentes } = await supabase
    .from("horarios")
    .select("dia_semana")
    .eq("professor_id", professorId)
    .eq("hora_inicio", base.data.hora_inicio)
    .eq("hora_fim", base.data.hora_fim)
    .in("dia_semana", diasValidos);
  const jaTem = new Set(
    ((existentes ?? []) as { dia_semana: number }[]).map((r) => r.dia_semana),
  );

  const aCriar = diasValidos.filter((d) => !jaTem.has(d));
  if (aCriar.length > 0) {
    const { error } = await supabase.from("horarios").insert(
      aCriar.map((d) => ({
        professor_id: professorId,
        dia_semana: d,
        hora_inicio: base.data.hora_inicio,
        hora_fim: base.data.hora_fim,
        capacidade: base.data.capacidade ?? null,
      })),
    );
    if (error) return falha("Não foi possível criar os horários.");
  }

  revalidatePath("/admin/horarios");
  return sucesso({ criados: aCriar.length, pulados: jaTem.size });
}

export async function excluirHorarioAdmin(id: string): Promise<ResultadoAcao> {
  await assertPapel(["admin"]);
  const supabase = await createClient();
  const { error } = await supabase.from("horarios").delete().eq("id", id);
  if (error) return falha("Não foi possível excluir o horário.");

  revalidatePath("/admin/horarios");
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
 * Corrige uma presença já registrada: muda a data e/ou o horário (null =
 * sem horário). O RLS garante que só o professor responsável edita, e o
 * índice único impede criar duplicata do mesmo aluno no mesmo dia/horário.
 */
export async function atualizarPresenca(
  id: string,
  data: string,
  hora: string | null,
): Promise<ResultadoAcao> {
  await assertPapel(["professor"]);
  if (!data) return falha("Informe a data.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("presencas")
    .update({ data, hora: hora || null })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return falha("Já existe presença desse aluno nesse dia/horário.");
    }
    return falha("Não foi possível atualizar a presença.");
  }

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
