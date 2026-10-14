import { AlertCircle, CalendarClock, CheckCircle2, ChevronRight } from "lucide-react";

import { PagamentoPix } from "@/app/(app)/aluno/mensalidade/pagamento-pix";
import { Card } from "@/components/ui/card";
import Link from "@/components/ui-extra/link";
import type { SituacaoMensalidade } from "@/lib/financeiro";
import { formatBRL, formatData } from "@/lib/formato";
import { cn } from "@/lib/utils";

function textos(s: SituacaoMensalidade): { titulo: string; detalhe: string } {
  if (s.tipo === "em_dia") {
    return { titulo: "Mensalidade em dia", detalhe: "Nenhuma pendência. Obrigado!" };
  }
  const resumo =
    s.qtd > 1 ? `${s.qtd} mensalidades · ${formatBRL(s.total)}` : formatBRL(s.total);
  if (s.tipo === "atrasada") {
    return {
      titulo: `Atrasada há ${s.dias} dia${s.dias > 1 ? "s" : ""}`,
      detalhe: `Venceu em ${formatData(s.vencimento)} · ${resumo}`,
    };
  }
  return {
    titulo: s.dias === 0 ? "Vence hoje" : `Vence em ${formatData(s.vencimento)}`,
    detalhe: resumo,
  };
}

/** Card da home do aluno: em dia / vence em DD/MM / atrasada há X dias. */
export function SituacaoMensalidadeCard({
  situacao,
}: {
  situacao: SituacaoMensalidade;
}) {
  const { titulo, detalhe } = textos(situacao);
  const tom =
    situacao.tipo === "em_dia"
      ? "bg-emerald-50 text-emerald-600"
      : situacao.tipo === "atrasada"
        ? "bg-red-50 text-red-600"
        : "bg-amber-50 text-amber-600";
  const Icone =
    situacao.tipo === "em_dia"
      ? CheckCircle2
      : situacao.tipo === "atrasada"
        ? AlertCircle
        : CalendarClock;

  return (
    <Card className="gap-4 p-5">
      <Link
        href="/aluno/mensalidade"
        className="-m-2 flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-secondary/40"
      >
        <span
          className={cn(
            "inline-flex size-11 shrink-0 items-center justify-center rounded-xl",
            tom,
          )}
        >
          <Icone className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">Mensalidade</p>
          <p className="font-semibold">{titulo}</p>
          <p className="truncate text-xs text-muted-foreground">{detalhe}</p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
      </Link>
      {situacao.tipo !== "em_dia" ? (
        <PagamentoPix
          valor={situacao.total}
          descricao={`${situacao.qtd} mensalidade(s) em aberto · ${formatBRL(situacao.total)}`}
        />
      ) : null}
    </Card>
  );
}
