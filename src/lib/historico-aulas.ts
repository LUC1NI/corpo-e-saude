/**
 * Histórico de aulas do aluno presencial: cruza os horários fixos dele
 * (`aluno_horarios`) com as presenças registradas.
 *
 * Não existe registro de "falta" no banco: falta = aula agendada, já passada,
 * sem presença naquele dia. Função pura (sem imports) para rodar no
 * `node --test`.
 */

export interface HorarioFixo {
  dia_semana: number; // 0=dom … 6=sáb
  hora_inicio: string;
  /** yyyy-MM-dd em que o aluno entrou nesse horário (antes disso, sem falta;
   *  presença no dia ainda conta como presente). */
  desde: string;
}

export interface AulaHistorico {
  data: string;
  hora: string | null;
  status: "presente" | "falta" | "extra";
}

function diaDaSemana(iso: string): number {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

function menosDias(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/**
 * Aulas entre `inicio` e `fim` (inclusive, yyyy-MM-dd), da mais recente para
 * a mais antiga. `hoje` sem presença não vira falta (a aula pode ainda não ter
 * acontecido). Presença em dia sem horário fixo vira "extra".
 */
export function historicoAulas({
  horarios,
  presencas,
  inicio,
  fim,
  hoje,
}: {
  horarios: HorarioFixo[];
  presencas: { data: string; hora: string | null }[];
  inicio: string;
  fim: string;
  hoje: string;
}): AulaHistorico[] {
  // Presenças por dia (uma presença "cobre" uma aula agendada no dia).
  const porDia = new Map<string, (string | null)[]>();
  for (const p of presencas) {
    if (p.data < inicio || p.data > fim) continue;
    porDia.set(p.data, [...(porDia.get(p.data) ?? []), p.hora]);
  }

  const saida: AulaHistorico[] = [];
  for (let d = fim; d >= inicio; d = menosDias(d, 1)) {
    const agendadas = horarios
      .filter((h) => h.dia_semana === diaDaSemana(d))
      .sort((a, b) => b.hora_inicio.localeCompare(a.hora_inicio));
    const doDia = [...(porDia.get(d) ?? [])];

    for (const h of agendadas) {
      if (doDia.length > 0) {
        doDia.pop();
        saida.push({ data: d, hora: h.hora_inicio, status: "presente" });
      } else if (d < hoje && d >= h.desde) {
        saida.push({ data: d, hora: h.hora_inicio, status: "falta" });
      }
    }
    for (const hora of doDia) saida.push({ data: d, hora, status: "extra" });
  }
  return saida;
}

/** Janela da página `pagina` (0 = mais recente), de `dias` dias, até `hoje`. */
export function janelaPagina(
  hoje: string,
  pagina: number,
  dias = 28,
): { inicio: string; fim: string } {
  const fim = menosDias(hoje, pagina * dias);
  return { inicio: menosDias(fim, dias - 1), fim };
}

/**
 * Aula "da vez" num dia: a que está acontecendo agora; senão a próxima;
 * senão a última do dia (para lançar a chamada que ficou para trás).
 * `agora` = "HH:mm" no fuso do estúdio; null = outro dia (pega a primeira).
 */
export function aulaDaVez<T extends { hora_inicio: string; hora_fim: string }>(
  slots: T[],
  agora: string | null,
): T | null {
  if (slots.length === 0) return null;
  if (agora === null) return slots[0]!;
  const ordenados = [...slots].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  return (
    ordenados.find((s) => s.hora_inicio.slice(0, 5) <= agora && agora < s.hora_fim.slice(0, 5)) ??
    ordenados.find((s) => s.hora_inicio.slice(0, 5) > agora) ??
    ordenados[ordenados.length - 1]!
  );
}
