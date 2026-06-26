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

/** Formata uma data (Date ou ISO) como dd/mm/aaaa. */
export function formatData(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return fmtDataCurta.format(d);
}

const fmtDataExtenso = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

/** Ex.: "quinta-feira, 25 de junho de 2026". */
export function formatDataExtenso(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return fmtDataExtenso.format(d);
}
