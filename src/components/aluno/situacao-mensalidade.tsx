import { precisaPagar, type SituacaoMensalidade } from "@/lib/financeiro";
import { formatBRL, formatDiaMes, plural } from "@/lib/formato";

export type TomMensalidade = "ok" | "aviso" | "atraso";

/** Título, detalhe e tom da situação — fonte única para o Início e a Mensalidade. */
export function textosMensalidade(s: SituacaoMensalidade): {
  tom: TomMensalidade;
  titulo: string;
  detalhe: string;
} {
  if (s.tipo === "em_dia") {
    return { tom: "ok", titulo: "Mensalidade em dia", detalhe: "Nenhuma pendência. Obrigado!" };
  }
  const resumo =
    s.qtd > 1 ? `${plural(s.qtd, "mensalidade", "mensalidades")} · ${formatBRL(s.total)}` : formatBRL(s.total);
  if (s.tipo === "atrasada") {
    return {
      tom: "atraso",
      titulo: `Atrasada há ${plural(s.dias, "dia", "dias")}`,
      detalhe: `Venceu em ${formatDiaMes(s.vencimento)} · ${resumo}`,
    };
  }
  if (!precisaPagar(s)) {
    return {
      tom: "ok",
      titulo: "Mensalidade em dia",
      detalhe: `Próxima em ${formatDiaMes(s.vencimento)} · ${formatBRL(s.total)}`,
    };
  }
  return {
    tom: "aviso",
    titulo:
      s.dias === 0 ? "Vence hoje" : s.dias === 1 ? "Vence amanhã" : `Vence em ${s.dias} dias`,
    detalhe: `${formatDiaMes(s.vencimento)} · ${resumo}`,
  };
}
