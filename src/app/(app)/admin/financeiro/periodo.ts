import { addMonths, format, isValid, parse, startOfMonth } from "date-fns";

/**
 * Período mensal navegável das telas do financeiro (?mes=yyyy-MM).
 * Centraliza o parse do parâmetro e os limites usados nas consultas.
 */
export interface PeriodoMes {
  /** Chave canônica do mês: "2026-07". */
  chave: string;
  /** Primeiro dia do mês (ISO) — também é a competência. */
  inicio: string;
  /** Primeiro dia do mês SEGUINTE (limite exclusivo p/ ranges). */
  fimExclusivo: string;
  /** "julho de 2026" */
  rotulo: string;
  /** Chaves para navegação. */
  anterior: string;
  proximo: string;
  ehMesAtual: boolean;
}

const fmtMesLongo = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

/** Rótulo curto de mês para eixos de gráfico: "jul". */
const fmtMesCurto = new Intl.DateTimeFormat("pt-BR", { month: "short" });

export function rotuloMesCurto(inicioISO: string): string {
  return fmtMesCurto
    .format(parse(inicioISO, "yyyy-MM-dd", new Date()))
    .replace(".", "");
}

/** Resolve o ?mes= da URL (ou o mês atual quando ausente/inválido). */
export function resolverMes(param?: string): PeriodoMes {
  const agora = startOfMonth(new Date());
  let base = agora;
  if (param) {
    const tentativa = parse(param, "yyyy-MM", new Date());
    if (isValid(tentativa)) base = startOfMonth(tentativa);
  }
  return {
    chave: format(base, "yyyy-MM"),
    inicio: format(base, "yyyy-MM-dd"),
    fimExclusivo: format(addMonths(base, 1), "yyyy-MM-dd"),
    rotulo: ((t) => t.charAt(0).toUpperCase() + t.slice(1))(fmtMesLongo.format(base)),
    anterior: format(addMonths(base, -1), "yyyy-MM"),
    proximo: format(addMonths(base, 1), "yyyy-MM"),
    ehMesAtual: base.getTime() === agora.getTime(),
  };
}

/** Os N meses que terminam no mês do período (para séries do gráfico). */
export function mesesAte(periodo: PeriodoMes, n: number): string[] {
  const fim = parse(periodo.inicio, "yyyy-MM-dd", new Date());
  const lista: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    lista.push(format(addMonths(fim, -i), "yyyy-MM-dd"));
  }
  return lista;
}
