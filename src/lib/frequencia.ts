import { addDays, format, getDay, parseISO, subDays } from "date-fns";

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
  /** 0–100, ou null quando o aluno não tem horário recorrente ou é novo. */
  pct: number | null;
  /** Tem horário fixo, mas ainda há poucas aulas para medir ("Começando"). */
  novo: boolean;
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
  // Três faixas de status (sem amarelo-lima): texto sempre com contraste AA.
  if (pct >= 75) return { forte: "#16A34A", texto: "#15803D", suave: "#E8F7EF" };
  if (pct >= 50) return { forte: "#F59E0B", texto: "#B45309", suave: "#FFF6E0" };
  return { forte: "#DC3B3B", texto: "#B42318", suave: "#FDECEC" };
}

/** Abaixo disto (aulas esperadas) ainda é cedo para julgar a frequência. */
export const MIN_AULAS_PARA_FREQUENCIA = 4;

/** Rótulo curto conforme a faixa de frequência. */
export function rotuloFrequencia(pct: number | null, novo = false): string {
  if (pct === null) return novo ? "Começando" : "Sem agenda fixa";
  if (pct >= 90) return "Excelente";
  if (pct >= 75) return "Boa";
  if (pct >= 50) return "Regular";
  if (pct >= 25) return "Baixa";
  return "Crítica";
}

export interface VinculoFrequencia {
  dia_semana: number;
  /** yyyy-MM-dd: desde quando o aluno está neste horário. */
  desde: string;
}

/**
 * Frequência = presenças ÷ aulas esperadas, na janela das últimas 8 semanas.
 * Uma aula só é "esperada" a partir do dia em que o aluno entrou no horário
 * (mesma regra do histórico de faltas) e só em dias já passados — hoje ainda
 * pode acontecer. Com poucas aulas esperadas, devolve pct = null e novo = true.
 * Função pura (datas yyyy-MM-dd no fuso do estúdio).
 */
export function calcularFrequencia(
  vinculos: VinculoFrequencia[],
  datasPresenca: string[],
  hoje: string,
): Omit<FrequenciaAluno, "aluno_id"> {
  if (vinculos.length === 0) {
    return { esperado: 0, presente: datasPresenca.length, pct: null, novo: false };
  }
  const inicioJanela = format(subDays(parseISO(hoje), JANELA_DIAS - 1), "yyyy-MM-dd");
  let esperado = 0;
  for (const v of vinculos) {
    const ini = v.desde > inicioJanela ? v.desde : inicioJanela;
    for (let d = parseISO(ini); format(d, "yyyy-MM-dd") < hoje; d = addDays(d, 1)) {
      if (getDay(d) === v.dia_semana) esperado++;
    }
  }
  const primeiro = vinculos.map((v) => v.desde).sort()[0]!;
  const corte = primeiro > inicioJanela ? primeiro : inicioJanela;
  const presente = datasPresenca.filter((d) => d >= corte && d < hoje).length;
  if (esperado < MIN_AULAS_PARA_FREQUENCIA) {
    return { esperado, presente, pct: null, novo: true };
  }
  const pct = Math.round((Math.min(presente, esperado) / esperado) * 100);
  return { esperado, presente, pct, novo: false };
}

/** Data (yyyy-MM-dd) de um timestamp no fuso do estúdio. */
export function dataNoEstudio(ts: string): string {
  return new Date(ts).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type DB = SupabaseClient<any, any, any>;

type VinculoRow = {
  aluno_id: string;
  criado_em: string;
  horarios: { dia_semana: number } | null;
};

function paraVinculos(rows: VinculoRow[]): Map<string, VinculoFrequencia[]> {
  const mapa = new Map<string, VinculoFrequencia[]>();
  for (const v of rows) {
    if (!v.horarios) continue;
    const lista = mapa.get(v.aluno_id) ?? [];
    lista.push({ dia_semana: v.horarios.dia_semana, desde: dataNoEstudio(v.criado_em) });
    mapa.set(v.aluno_id, lista);
  }
  return mapa;
}

/**
 * Frequência de vários alunos de uma vez (2 consultas, sem N+1).
 * Retorna um mapa aluno_id → frequência.
 */
export async function getFrequenciaAlunos(
  supabase: DB,
  alunoIds: string[],
  hoje: string,
): Promise<Map<string, FrequenciaAluno>> {
  const mapa = new Map<string, FrequenciaAluno>();
  if (alunoIds.length === 0) return mapa;

  const limite = format(subDays(parseISO(hoje), JANELA_DIAS - 1), "yyyy-MM-dd");
  const [{ data: vincData }, { data: presData }] = await Promise.all([
    supabase
      .from("aluno_horarios")
      .select("aluno_id, criado_em, horarios(dia_semana)")
      .in("aluno_id", alunoIds),
    supabase
      .from("presencas")
      .select("aluno_id, data")
      .in("aluno_id", alunoIds)
      .gte("data", limite),
  ]);

  const vinculos = paraVinculos((vincData ?? []) as unknown as VinculoRow[]);
  const presPorAluno = new Map<string, string[]>();
  for (const p of (presData ?? []) as { aluno_id: string; data: string }[]) {
    presPorAluno.set(p.aluno_id, [...(presPorAluno.get(p.aluno_id) ?? []), p.data]);
  }

  for (const id of alunoIds) {
    const freq = calcularFrequencia(vinculos.get(id) ?? [], presPorAluno.get(id) ?? [], hoje);
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
  hoje: string,
): Promise<{ freq: FrequenciaAluno; recentes: PresencaRecenteAluno[] }> {
  const limite = format(subDays(parseISO(hoje), JANELA_DIAS - 1), "yyyy-MM-dd");
  const [{ data: vincData }, { data: presData }, { data: janelaData }] = await Promise.all([
    supabase
      .from("aluno_horarios")
      .select("aluno_id, criado_em, horarios(dia_semana)")
      .eq("aluno_id", alunoId),
    supabase
      .from("presencas")
      .select("data, hora")
      .eq("aluno_id", alunoId)
      .order("data", { ascending: false })
      .order("criado_em", { ascending: false })
      .limit(60),
    supabase.from("presencas").select("data").eq("aluno_id", alunoId).gte("data", limite),
  ]);

  const vinculos = paraVinculos((vincData ?? []) as unknown as VinculoRow[]).get(alunoId) ?? [];
  const datas = ((janelaData ?? []) as { data: string }[]).map((p) => p.data);
  const freq = calcularFrequencia(vinculos, datas, hoje);
  return {
    freq: { ...freq, aluno_id: alunoId },
    recentes: (presData ?? []) as PresencaRecenteAluno[],
  };
}
