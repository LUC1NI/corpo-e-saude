"use client";

import { DIAS_SEMANA_CURTO } from "@/lib/tipos";
import { cn } from "@/lib/utils";

/** Seletor de dias da semana (0=Dom .. 6=Sáb) por toggle de chips. */
export function SeletorDiasSemana({
  value,
  onChange,
}: {
  value: number[];
  onChange: (dias: number[]) => void;
}) {
  function alternar(dia: number) {
    onChange(
      value.includes(dia)
        ? value.filter((d) => d !== dia)
        : [...value, dia].sort((a, b) => a - b),
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {DIAS_SEMANA_CURTO.map((rotulo, dia) => {
        const ativo = value.includes(dia);
        return (
          <button
            key={dia}
            type="button"
            onClick={() => alternar(dia)}
            aria-pressed={ativo}
            className={cn(
              "h-8 min-w-9 rounded-lg border px-2 text-xs font-medium transition-colors",
              ativo
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary",
            )}
          >
            {rotulo}
          </button>
        );
      })}
    </div>
  );
}
