import { agoraNoEstudio } from "@/lib/financeiro";
import type { DivisaoComExercicios, TreinoComTudo } from "@/lib/tipos";

/** Dia da semana de hoje (0=domingo .. 6=sábado), no fuso do estúdio. */
export function diaDaSemanaHoje(): number {
  return agoraNoEstudio().getDay();
}

/** Divisões agendadas para um dia da semana (achatando as fichas dadas). */
export function divisoesDoDia(
  treinos: TreinoComTudo[],
  dia: number,
): DivisaoComExercicios[] {
  return treinos
    .flatMap((t) => t.divisoes)
    .filter((d) => d.dias_semana.includes(dia));
}
