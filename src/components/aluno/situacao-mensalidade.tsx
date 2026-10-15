import { AlertCircle, CalendarClock, CheckCircle2, ChevronRight } from "lucide-react";

import { PagamentoPix } from "@/app/(app)/aluno/mensalidade/pagamento-pix";
import { Card } from "@/components/ui/card";
import Link from "@/components/ui-extra/link";
import { precisaPagar, type SituacaoMensalidade } from "@/lib/financeiro";
import { formatBRL, formatDiaMes, plural } from "@/lib/formato";
import { cn } from "@/lib/utils";

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
      detalhe: `Próxima: ${formatDiaMes(s.vencimento)} · ${formatBRL(s.total)}`,
    };
  }
  return {
    tom: "aviso",
    titulo:
      s.dias === 0 ? "Vence hoje" : s.dias === 1 ? "Vence amanhã" : `Vence em ${s.dias} dias`,
    detalhe: `${formatDiaMes(s.vencimento)} · ${resumo}`,
  };
}

const TOM_ICONE: Record<TomMensalidade, string> = {
  ok: "bg-emerald-50 text-emerald-600",
  aviso: "bg-amber-50 text-amber-600",
  atraso: "bg-red-50 text-red-600",
};
const ICONE = { ok: CheckCircle2, aviso: CalendarClock, atraso: AlertCircle };

/** Card da home do aluno: em dia / vence em N dias / atrasada há N dias. */
export function SituacaoMensalidadeCard({
  situacao,
}: {
  situacao: SituacaoMensalidade;
}) {
  const { tom, titulo, detalhe } = textosMensalidade(situacao);
  const Icone = ICONE[tom];

  return (
    <Card className="gap-4 p-5">
      <Link
        href="/aluno/mensalidade"
        className="-m-2 flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-secondary/40"
      >
        <span
          className={cn(
            "inline-flex size-11 shrink-0 items-center justify-center rounded-xl",
            TOM_ICONE[tom],
          )}
        >
          <Icone className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">Mensalidade</p>
          <p className="font-semibold">{tom === "ok" ? "Em dia" : titulo}</p>
          <p className="text-sm text-muted-foreground">{detalhe}</p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
      </Link>
      {situacao.tipo !== "em_dia" && precisaPagar(situacao) ? (
        <PagamentoPix valor={situacao.total} descricao={detalhe} />
      ) : null}
    </Card>
  );
}
