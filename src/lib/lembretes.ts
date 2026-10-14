/**
 * Qual lembrete de mensalidade cabe a uma cobrança em aberto hoje. Pura (sem
 * imports) para rodar no `node --test`.
 *
 * Usa JANELAS em vez de datas exatas: se o cron falhar um dia, o lembrete sai
 * no dia seguinte. A trava `notificacoes_enviadas (tipo, referencia_id)`
 * garante que cada tipo é enviado uma vez só por pagamento.
 */
export type TipoLembrete =
  | "mensalidade_antes"
  | "mensalidade_dia"
  | "mensalidade_atraso";

/** Até quantos dias de atraso ainda vale mandar o aviso "venceu". */
const ATRASO_MAX = 10;

function diasEntre(deISO: string, ateISO: string): number {
  const ms =
    Date.parse(`${ateISO}T12:00:00Z`) - Date.parse(`${deISO}T12:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export function lembreteDoPagamento(
  vencimento: string,
  hoje: string,
): TipoLembrete | null {
  const faltam = diasEntre(hoje, vencimento);
  if (faltam >= 1 && faltam <= 3) return "mensalidade_antes";
  if (faltam === 0) return "mensalidade_dia";
  if (faltam <= -3 && faltam >= -ATRASO_MAX) return "mensalidade_atraso";
  return null;
}

/** Janela de vencimentos que podem gerar algum lembrete hoje (para a query). */
export function janelaLembretes(hoje: string): { de: string; ate: string } {
  const somar = (n: number) => {
    const d = new Date(`${hoje}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  return { de: somar(-ATRASO_MAX), ate: somar(3) };
}

/** "2026-10-15" -> "15/10". */
function diaMes(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** Título e texto do aviso. */
export function textoLembrete(
  tipo: TipoLembrete,
  vencimento: string,
  valor: number,
): { titulo: string; corpo: string } {
  const reais = valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  switch (tipo) {
    case "mensalidade_antes":
      return {
        titulo: `Sua mensalidade vence em ${diaMes(vencimento)}`,
        corpo: `Valor ${reais}. Toque para ver como pagar pelo Pix.`,
      };
    case "mensalidade_dia":
      return {
        titulo: "Sua mensalidade vence hoje",
        corpo: `Valor ${reais}. Toque para pagar pelo Pix.`,
      };
    case "mensalidade_atraso":
      return {
        titulo: "Mensalidade em aberto",
        corpo: `Venceu em ${diaMes(vencimento)} (${reais}). Toque para regularizar pelo Pix.`,
      };
  }
}
