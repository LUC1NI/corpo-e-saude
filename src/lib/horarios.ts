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

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** "Seg e Qua às 07:00" / "Seg 07:00 · Qui 18:00" — resumo dos horários fixos. */
export function resumoHorarios(hs: { dia_semana: number; hora_inicio: string }[]): string | null {
  if (hs.length === 0) return null;
  const ord = [...hs].sort((a, b) => a.dia_semana - b.dia_semana || a.hora_inicio.localeCompare(b.hora_inicio));
  const horas = new Set(ord.map((h) => h.hora_inicio.slice(0, 5)));
  if (horas.size === 1) {
    const dias = ord.map((h) => DIAS[h.dia_semana]);
    const lista = dias.length > 1 ? `${dias.slice(0, -1).join(", ")} e ${dias.at(-1)}` : dias[0];
    return `${lista} às ${[...horas][0]}`;
  }
  return ord.map((h) => `${DIAS[h.dia_semana]} ${h.hora_inicio.slice(0, 5)}`).join(" · ");
}
