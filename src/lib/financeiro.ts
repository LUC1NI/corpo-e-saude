import { addMonths, format, parseISO, startOfMonth } from "date-fns";

import { MESES_POR_PERIODICIDADE, type Periodicidade } from "@/lib/tipos";

/** Data de hoje em ISO (yyyy-MM-dd). */
export function hojeISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/** Próxima cobrança = data + nº de meses da periodicidade. */
export function proximaCobranca(
  dataISO: string,
  periodicidade: Periodicidade,
): string {
  return format(
    addMonths(parseISO(dataISO), MESES_POR_PERIODICIDADE[periodicidade]),
    "yyyy-MM-dd",
  );
}

/** Competência (mês de referência) = primeiro dia do mês da data. */
export function competenciaDe(dataISO: string): string {
  return format(startOfMonth(parseISO(dataISO)), "yyyy-MM-dd");
}

/** Rótulo da competência: "06/2026". */
export function rotuloCompetencia(dataISO: string): string {
  return format(parseISO(dataISO), "MM/yyyy");
}
