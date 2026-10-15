import type { HorarioOpcao } from "@/components/alunos/cadastro-rapido";
import type { createClient } from "@/lib/supabase/server";

/** Horários da grade com a ocupação atual (para o cadastro rápido). */
export async function horariosComOcupacao(
  supabase: Awaited<ReturnType<typeof createClient>>,
  professorId?: string,
): Promise<HorarioOpcao[]> {
  let q = supabase
    .from("horarios")
    .select("id, professor_id, dia_semana, hora_inicio, capacidade, aluno_horarios(count)")
    .order("hora_inicio");
  if (professorId) q = q.eq("professor_id", professorId);
  const { data } = await q;
  return ((data ?? []) as unknown as (Omit<HorarioOpcao, "ocupados"> & {
    aluno_horarios: { count: number }[];
  })[]).map(({ aluno_horarios, ...h }) => ({ ...h, ocupados: aluno_horarios[0]?.count ?? 0 }));
}
