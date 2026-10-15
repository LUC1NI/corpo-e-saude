"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertPapel, type Papel } from "@/lib/auth";
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

/**
 * Confere quem pode mexer num horário: admin (qualquer um) ou o professor
 * dono dele. Devolve o horário ou null.
 */
async function horarioEditavel(horarioId: string) {
  const usuario = await assertPapel(["admin", "professor"]);
  const id = z.string().uuid().safeParse(horarioId);
  if (!id.success) return null;
  const supabase = await createClient();
  let q = supabase.from("horarios").select("id, professor_id").eq("id", id.data);
  if (usuario.papel === "professor") {
    const professor = await getProfessorAtual();
    if (!professor) return null;
    q = q.eq("professor_id", professor.id);
  }
  const { data } = await q.maybeSingle();
  return data ? { supabase, horario: data as { id: string; professor_id: string } } : null;
}

function revalidarAgenda() {
  for (const p of ["/admin", "/admin/horarios", "/admin/presenca", "/professor", "/professor/horarios", "/professor/presenca"]) {
    revalidatePath(p);
  }
}

/** Exclui um horário da grade (admin ou o professor dono). */
export async function excluirHorario(id: string): Promise<ResultadoAcao> {
  const ctx = await horarioEditavel(id);
  if (!ctx) return falha("Horário não encontrado.");
  const { error } = await ctx.supabase.from("horarios").delete().eq("id", ctx.horario.id);
  if (error) return falha("Não foi possível excluir o horário.");
  revalidarAgenda();
  return sucesso();
}

/**
 * Define quais alunos estão agendados em um horário (admin ou professor dono).
 * Atualiza só a diferença (remove os desmarcados, insere os novos), então uma
 * falha no meio nunca deixa a turma vazia. O RLS ainda garante que o
 * professor só vincula alunos da própria carteira.
 */
export async function definirAlunosDoHorario(
  horarioId: string,
  alunoIds: string[],
): Promise<ResultadoAcao> {
  const ids = z.array(z.string().uuid()).max(200).safeParse(alunoIds);
  if (!ids.success) return falha("Lista de alunos inválida.");
  const ctx = await horarioEditavel(horarioId);
  if (!ctx) return falha("Horário não encontrado.");
  const { supabase, horario } = ctx;

  const { data: atuaisData, error: errSel } = await supabase
    .from("aluno_horarios")
    .select("aluno_id")
    .eq("horario_id", horario.id);
  if (errSel) return falha("Não foi possível atualizar os alunos da aula.");
  const atuais = new Set((atuaisData ?? []).map((r) => r.aluno_id as string));
  const desejados = new Set(ids.data);

  const remover = [...atuais].filter((a) => !desejados.has(a));
  const inserir = [...desejados].filter((a) => !atuais.has(a));

  if (inserir.length > 0) {
    const { error } = await supabase
      .from("aluno_horarios")
      .insert(inserir.map((aluno_id) => ({ horario_id: horario.id, aluno_id })));
    if (error) return falha("Não foi possível incluir os alunos (confira se são da carteira do professor).");
  }
  if (remover.length > 0) {
    const { error } = await supabase
      .from("aluno_horarios")
      .delete()
      .eq("horario_id", horario.id)
      .in("aluno_id", remover);
    if (error) return falha("Não foi possível retirar os alunos da aula.");
  }

  revalidarAgenda();
  revalidatePath("/aluno", "layout");
  return sucesso();
}

/**
 * Define os horários fixos de UM aluno (admin, ou professor nos próprios
 * horários com aluno da própria carteira — o RLS garante). Atualiza só a
 * diferença. Professor só mexe nos vínculos com horários dele.
 */
export async function definirHorariosDoAluno(
  alunoId: string,
  horarioIds: string[],
): Promise<ResultadoAcao> {
  const usuario = await assertPapel(["admin", "professor"]);
  const aluno = z.string().uuid().safeParse(alunoId);
  const ids = z.array(z.string().uuid()).max(14).safeParse(horarioIds);
  if (!aluno.success || !ids.success) return falha("Dados inválidos.");
  const supabase = await createClient();

  let profId: string | null = null;
  if (usuario.papel === "professor") {
    const professor = await getProfessorAtual();
    if (!professor) return falha("Professor não encontrado.");
    profId = professor.id;
  }

  const { data: atuaisData, error } = await supabase
    .from("aluno_horarios")
    .select("horario_id, horarios(professor_id)")
    .eq("aluno_id", aluno.data);
  if (error) return falha("Não foi possível ler os horários do aluno.");
  const atuais = ((atuaisData ?? []) as unknown as {
    horario_id: string;
    horarios: { professor_id: string } | null;
  }[]).filter((r) => profId === null || r.horarios?.professor_id === profId);
  const atuaisIds = new Set(atuais.map((r) => r.horario_id));
  const desejados = new Set(ids.data);

  const inserir = [...desejados].filter((h) => !atuaisIds.has(h));
  const remover = [...atuaisIds].filter((h) => !desejados.has(h));

  if (inserir.length > 0) {
    const { error: e } = await supabase
      .from("aluno_horarios")
      .insert(inserir.map((horario_id) => ({ aluno_id: aluno.data, horario_id })));
    if (e) return falha("Não foi possível incluir o aluno nos horários.");
  }
  if (remover.length > 0) {
    const { error: e } = await supabase
      .from("aluno_horarios")
      .delete()
      .eq("aluno_id", aluno.data)
      .in("horario_id", remover);
    if (e) return falha("Não foi possível tirar o aluno dos horários.");
  }

  revalidarAgenda();
  revalidatePath(`/admin/alunos/${aluno.data}`);
  revalidatePath(`/professor/alunos/${aluno.data}`);
  revalidatePath("/aluno", "layout");
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

// ---------------------------------------------------------------------------
// Presença (marcação por dia / horário)
//
// Marcam presença: o professor (na própria carteira) e o admin. A presença
// NÃO depende do horário da aula ter passado — o professor pode lançar à
// noite, no dia seguinte etc. (marcação retroativa). Quando o admin marca,
// o `professor_id` da presença é o professor daquela aula/aluno, informado
// por quem chama.
// ---------------------------------------------------------------------------

/**
 * Resolve o `professor_id` a gravar na presença conforme o papel:
 *  - professor: sempre o próprio (ignora o argumento, não dá para marcar
 *    presença na carteira de outro);
 *  - admin: o `professorId` informado (o professor daquela aula).
 * Retorna `null` quando algo impede (sem perfil / admin sem professor).
 */
async function resolverProfessorPresenca(
  papel: Papel,
  professorIdInformado: string | null,
): Promise<string | null> {
  if (papel === "professor") {
    const professor = await getProfessorAtual();
    return professor?.id ?? null;
  }
  return professorIdInformado ?? null;
}

const CAMINHOS_PRESENCA = [
  "/professor/presenca",
  "/professor/horarios",
  "/admin/presenca",
];
function revalidarPresenca() {
  for (const p of CAMINHOS_PRESENCA) revalidatePath(p);
}

export async function marcarPresenca(
  alunoId: string,
  data: string,
  hora: string | null,
  professorId: string | null = null,
): Promise<ResultadoAcao> {
  const usuario = await assertPapel(["professor", "admin"]);
  const profId = await resolverProfessorPresenca(usuario.papel, professorId);
  if (!profId) return falha("Professor não encontrado.");

  const supabase = await createClient();
  const { error } = await supabase.from("presencas").insert({
    aluno_id: alunoId,
    professor_id: profId,
    data,
    hora,
  });
  if (error) return falha("Não foi possível registrar a presença.");

  revalidarPresenca();
  return sucesso();
}

export async function removerPresenca(id: string): Promise<ResultadoAcao> {
  await assertPapel(["professor", "admin"]);
  const supabase = await createClient();
  const { error } = await supabase.from("presencas").delete().eq("id", id);
  if (error) return falha("Não foi possível remover a presença.");

  revalidarPresenca();
  return sucesso();
}

/**
 * Corrige uma presença já registrada: muda a data e/ou o horário (null =
 * sem horário). O RLS garante que só o professor responsável (ou o admin)
 * edita, e o índice único impede duplicar o mesmo aluno no mesmo dia/horário.
 */
export async function atualizarPresenca(
  id: string,
  data: string,
  hora: string | null,
): Promise<ResultadoAcao> {
  await assertPapel(["professor", "admin"]);
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

  revalidarPresenca();
  return sucesso();
}

/**
 * Alterna a presença de um aluno em uma data (e opcionalmente um horário):
 * cria se não existir, remove se já existir. Base do roster diário. Funciona
 * para qualquer data (inclusive retroativa). Admin informa o `professorId`
 * da aula; professor usa a própria carteira.
 */
export async function alternarPresenca(
  alunoId: string,
  data: string,
  hora: string | null,
  professorId: string | null = null,
): Promise<ResultadoAcao<{ presente: boolean }>> {
  const usuario = await assertPapel(["professor", "admin"]);
  const profId = await resolverProfessorPresenca(usuario.papel, professorId);
  if (!profId) return falha("Professor não encontrado.");

  const supabase = await createClient();

  let consulta = supabase
    .from("presencas")
    .select("id")
    .eq("aluno_id", alunoId)
    .eq("data", data)
    .eq("professor_id", profId);
  consulta = hora ? consulta.eq("hora", hora) : consulta.is("hora", null);

  const { data: existente } = await consulta.maybeSingle();

  if (existente) {
    const { error } = await supabase
      .from("presencas")
      .delete()
      .eq("id", existente.id);
    if (error) return falha("Não foi possível atualizar a presença.");
    revalidarPresenca();
    return sucesso({ presente: false });
  }

  const { error } = await supabase.from("presencas").insert({
    aluno_id: alunoId,
    professor_id: profId,
    data,
    hora,
  });
  if (error) return falha("Não foi possível registrar a presença.");
  revalidarPresenca();
  return sucesso({ presente: true });
}
