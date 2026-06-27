import type { DivisaoComExercicios, TreinoComTudo } from "@/lib/tipos";

/** Dia da semana de hoje (0=domingo .. 6=sábado), no fuso do servidor. */
export function diaDaSemanaHoje(): number {
  return new Date().getDay();
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
