import { format, subDays } from "date-fns";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Frequência (assiduidade) do aluno.
 *
 * Compara quantas aulas o aluno tinha AGENDADAS na grade recorrente
 * (`aluno_horarios` → `horarios.dia_semana`) com quantas presenças ele de fato
 * registrou, dentro de uma janela recente. Assim o percentual reflete "de cada
 * 10 aulas marcadas na semana, em quantas ele apareceu".
 *
 * Aluno sem agenda recorrente (ex.: online/avulso) tem `pct = null` — não faz
 * sentido cobrar assiduidade de quem não tem horário fixo.
 */

/** Janela de análise: últimas 8 semanas. */
export const JANELA_DIAS = 56;

export interface FrequenciaAluno {
  aluno_id: string;
  esperado: number;
  presente: number;
  /** 0–100, ou null quando o aluno não tem horário recorrente. */
  pct: number | null;
}

/** Quantas vezes cada dia da semana (0=dom … 6=sáb) cai na janela recente. */
export function contarDiasSemanaJanela(hoje: Date, dias = JANELA_DIAS): number[] {
  const cont = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < dias; i++) {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() - i);
    cont[d.getDay()]! += 1;
  }
  return cont;
}

/**
 * Cor do degradê vermelho → verde conforme o percentual.
 * 0% = vermelho, 100% = verde, interpolando o matiz (HSL).
 */
export function corFrequencia(pct: number): {
  /** Cor cheia (traço do medidor, texto de destaque). */
  forte: string;
  /** Cor de texto com bom contraste sobre fundo claro. */
  texto: string;
  /** Versão translúcida para fundos/preenchimentos suaves. */
  suave: string;
} {
  const p = Math.max(0, Math.min(100, pct));
  const hue = Math.round((p / 100) * 130); // 0 vermelho → 130 verde
  return {
    forte: `hsl(${hue} 82% 45%)`,
    texto: `hsl(${hue} 72% 36%)`,
    suave: `hsl(${hue} 82% 45% / 0.14)`,
  };
}

/** Rótulo curto conforme a faixa de frequência. */
export function rotuloFrequencia(pct: number | null): string {
  if (pct === null) return "Sem agenda fixa";
  if (pct >= 90) return "Excelente";
  if (pct >= 75) return "Boa";
  if (pct >= 50) return "Regular";
  if (pct >= 25) return "Baixa";
  return "Crítica";
}

/**
 * Calcula a frequência a partir dos dias da semana agendados e da contagem de
 * presenças na janela. Função pura — fácil de testar e reutilizar.
 */
export function calcularFrequencia(
  diasSemanaAgendados: number[],
  presencasNaJanela: number,
  contagemDias: number[],
): FrequenciaAluno & { aluno_id: string } {
  const esperado = diasSemanaAgendados.reduce(
    (soma, dow) => soma + (contagemDias[dow] ?? 0),
    0,
  );
  if (esperado === 0) {
    return { aluno_id: "", esperado: 0, presente: presencasNaJanela, pct: null };
  }
  const efetivas = Math.min(presencasNaJanela, esperado);
  const pct = Math.round((efetivas / esperado) * 100);
  return { aluno_id: "", esperado, presente: presencasNaJanela, pct };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type DB = SupabaseClient<any, any, any>;

/**
 * Frequência de vários alunos de uma vez (2 consultas, sem N+1).
 * Retorna um mapa aluno_id → frequência.
 */
export async function getFrequenciaAlunos(
  supabase: DB,
  alunoIds: string[],
  hoje: Date = new Date(),
): Promise<Map<string, FrequenciaAluno>> {
  const mapa = new Map<string, FrequenciaAluno>();
  if (alunoIds.length === 0) return mapa;

  const limite = format(subDays(hoje, JANELA_DIAS - 1), "yyyy-MM-dd");
  const contagem = contarDiasSemanaJanela(hoje);

  const [{ data: vincData }, { data: presData }] = await Promise.all([
    supabase
      .from("aluno_horarios")
      .select("aluno_id, horarios(dia_semana)")
      .in("aluno_id", alunoIds),
    supabase
      .from("presencas")
      .select("aluno_id, data")
      .in("aluno_id", alunoIds)
      .gte("data", limite),
  ]);

  const diasPorAluno = new Map<string, number[]>();
  for (const v of (vincData ?? []) as unknown as {
    aluno_id: string;
    horarios: { dia_semana: number } | null;
  }[]) {
    if (!v.horarios) continue;
    const lista = diasPorAluno.get(v.aluno_id) ?? [];
    lista.push(v.horarios.dia_semana);
    diasPorAluno.set(v.aluno_id, lista);
  }

  const presPorAluno = new Map<string, number>();
  for (const p of (presData ?? []) as { aluno_id: string }[]) {
    presPorAluno.set(p.aluno_id, (presPorAluno.get(p.aluno_id) ?? 0) + 1);
  }

  for (const id of alunoIds) {
    const freq = calcularFrequencia(
      diasPorAluno.get(id) ?? [],
      presPorAluno.get(id) ?? 0,
      contagem,
    );
    mapa.set(id, { ...freq, aluno_id: id });
  }
  return mapa;
}

export interface PresencaRecenteAluno {
  data: string;
  hora: string | null;
}

/**
 * Frequência de UM aluno + suas presenças recentes (para a página de detalhe).
 */
export async function getFrequenciaDoAluno(
  supabase: DB,
  alunoId: string,
  hoje: Date = new Date(),
): Promise<{ freq: FrequenciaAluno; recentes: PresencaRecenteAluno[] }> {
  const limite = format(subDays(hoje, JANELA_DIAS - 1), "yyyy-MM-dd");
  const contagem = contarDiasSemanaJanela(hoje);

  const [{ data: vincData }, { data: presData }] = await Promise.all([
    supabase
      .from("aluno_horarios")
      .select("horarios(dia_semana)")
      .eq("aluno_id", alunoId),
    supabase
      .from("presencas")
      .select("data, hora")
      .eq("aluno_id", alunoId)
      .order("data", { ascending: false })
      .order("criado_em", { ascending: false })
      .limit(60),
  ]);

  const dias = ((vincData ?? []) as unknown as {
    horarios: { dia_semana: number } | null;
  }[])
    .map((v) => v.horarios?.dia_semana)
    .filter((d): d is number => typeof d === "number");

  const presencas = (presData ?? []) as PresencaRecenteAluno[];
  const naJanela = presencas.filter((p) => p.data >= limite).length;

  const freq = calcularFrequencia(dias, naJanela, contagem);
  return { freq: { ...freq, aluno_id: alunoId }, recentes: presencas };
}
