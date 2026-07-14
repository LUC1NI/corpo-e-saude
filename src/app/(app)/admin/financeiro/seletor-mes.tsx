import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "@/components/ui-extra/link";

import type { PeriodoMes } from "./periodo";

/**
 * Navegador de mês (← julho de 2026 →) via querystring — Server Component,
 * sem JS no cliente. No celular ocupa a largura toda, com as setas nas
 * pontas (fácil de alcançar com o polegar).
 */
export function SeletorMes({
  periodo,
  base,
}: {
  periodo: PeriodoMes;
  base: string;
}) {
  const seta =
    "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border bg-card text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-foreground";
  return (
    <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
      <Link
        href={`${base}?mes=${periodo.anterior}`}
        aria-label="Mês anterior"
        className={seta}
      >
        <ChevronLeft className="size-4" />
      </Link>
      <div className="min-w-0 text-center sm:min-w-40">
        <p className="truncate text-sm font-semibold capitalize">
          {periodo.rotulo}
          {periodo.ehMesAtual ? (
            <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-primary uppercase">
              atual
            </span>
          ) : null}
        </p>
        {!periodo.ehMesAtual ? (
          <Link
            href={base}
            className="text-xs font-medium text-primary hover:underline"
          >
            Voltar ao mês atual
          </Link>
        ) : null}
      </div>
      <Link
        href={`${base}?mes=${periodo.proximo}`}
        aria-label="Próximo mês"
        className={seta}
      >
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}
