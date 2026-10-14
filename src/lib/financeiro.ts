import {
  addMonths,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfMonth,
} from "date-fns";

import { MESES_POR_PERIODICIDADE, type Periodicidade } from "@/lib/tipos";

/**
 * "Agora" no relógio do estúdio (Mafra/SC). O servidor (Cloudflare Workers)
 * roda em UTC: sem isto, depois das 21h o sistema já achava que era amanhã.
 * O Date devolvido tem os getters locais (getDay/getHours…) no horário de
 * Brasília, seja qual for o fuso do servidor.
 */
export function agoraNoEstudio(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
}

/** Data de hoje em ISO (yyyy-MM-dd), no fuso do estúdio. */
export function hojeISO(): string {
  return format(agoraNoEstudio(), "yyyy-MM-dd");
}

export type SituacaoMensalidade =
  | { tipo: "em_dia" }
  | {
      tipo: "a_vencer" | "atrasada";
      /** Vencimento mais antigo em aberto. */
      vencimento: string;
      /** a_vencer: dias até vencer (0 = hoje). atrasada: dias de atraso. */
      dias: number;
      total: number;
      qtd: number;
    };

/** Situação da mensalidade a partir das cobranças em aberto (não pagas). */
export function situacaoMensalidade(
  abertos: { vencimento: string; valor: number }[],
  hoje: string,
): SituacaoMensalidade {
  if (abertos.length === 0) return { tipo: "em_dia" };
  const vencimento = abertos.map((p) => p.vencimento).sort()[0]!;
  const total = abertos.reduce((s, p) => s + Number(p.valor), 0);
  const dif = differenceInCalendarDays(parseISO(vencimento), parseISO(hoje));
  return dif < 0
    ? { tipo: "atrasada", vencimento, dias: -dif, total, qtd: abertos.length }
    : { tipo: "a_vencer", vencimento, dias: dif, total, qtd: abertos.length };
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
