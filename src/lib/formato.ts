import { parseISO } from "date-fns";

/** Iniciais a partir de um nome (até 2 letras), para avatares. */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0]!.slice(0, 2).toUpperCase();
  return (partes[0]![0]! + partes[partes.length - 1]![0]!).toUpperCase();
}

const fmtBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Formata um valor numérico como moeda brasileira (R$). */
export function formatBRL(valor: number): string {
  return fmtBRL.format(valor);
}

const fmtDataCurta = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// Usa parseISO para que "yyyy-MM-dd" seja lido como data LOCAL (e não UTC,
// o que deslocaria um dia em fusos negativos como o do Brasil).
function paraData(data: Date | string): Date {
  return typeof data === "string" ? parseISO(data) : data;
}

/** Formata uma data (Date ou ISO) como dd/mm/aaaa. */
export function formatData(data: Date | string): string {
  return fmtDataCurta.format(paraData(data));
}

const fmtDataExtenso = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

/** Ex.: "quinta-feira, 25 de junho de 2026". */
export function formatDataExtenso(data: Date | string): string {
  return fmtDataExtenso.format(paraData(data));
}

/** "1 aula" / "3 aulas" — nunca "aula(s)". */
export function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

const fmtDiaMes = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
});

/** Formata como dd/mm (sem ano), para datas próximas. */
export function formatDiaMes(data: Date | string): string {
  return fmtDiaMes.format(paraData(data));
}

const MESES_CURTOS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

/** Competência legível: "2026-10-01" → "Out/2026". */
export function formatMesAno(data: Date | string): string {
  const d = paraData(data);
  return `${MESES_CURTOS[d.getMonth()]}/${d.getFullYear()}`;
}

/**
 * Texto digitado no padrão brasileiro → string numérica que o Zod entende.
 * "1.234,56" → "1234.56" · "R$ 2.500" → "2500" · "72,5" → "72.5" · "1.70" → "1.70".
 * Ponto sem vírgula só é milhar quando separa grupos de 3 dígitos.
 */
export function lerDecimalBR(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const t = v.replace(/[R$\s]/g, "");
  if (t === "") return undefined;
  if (t.includes(",")) return t.replace(/\./g, "").replace(",", ".");
  return /^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, "") : t;
}
