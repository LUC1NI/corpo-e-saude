import { CalendarCheck } from "lucide-react";

import { corFrequencia, rotuloFrequencia } from "@/lib/frequencia";
import { cn } from "@/lib/utils";

/**
 * Medidores visuais de frequência (assiduidade) do aluno.
 * A cor varia num degradê contínuo do vermelho (0%) ao verde (100%).
 */

/** Badge compacto para listas: pílula colorida com o percentual. */
export function FrequenciaBadge({
  pct,
  className,
}: {
  pct: number | null;
  className?: string;
}) {
  if (pct === null) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
          className,
        )}
      >
        —
      </span>
    );
  }
  const cor = corFrequencia(pct);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        className,
      )}
      style={{ backgroundColor: cor.suave, color: cor.texto }}
    >
      {pct}%
    </span>
  );
}

/**
 * Indicador compacto para ficar na mesma linha do nome (cabeçalho da página):
 * um pontinho colorido no degradê + o percentual e um rótulo curto.
 */
export function FrequenciaInline({
  pct,
  novo = false,
}: {
  pct: number | null;
  novo?: boolean;
}) {
  if (pct === null) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
        {rotuloFrequencia(null, novo)}
      </span>
    );
  }
  const cor = corFrequencia(pct);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: cor.suave, color: cor.texto }}
      title={`${rotuloFrequencia(pct)} · frequência nas últimas 8 semanas`}
    >
      <span
        className="size-2 rounded-full"
        style={{ backgroundColor: cor.forte }}
      />
      {pct}% de presença
    </span>
  );
}

/**
 * Anel de progresso (SVG) com o percentual no centro. A cor do traço vem do
 * degradê vermelho→verde, então bate o olho e já se entende a assiduidade.
 */
export function FrequenciaRing({
  pct,
  tamanho = 128,
}: {
  pct: number | null;
  tamanho?: number;
}) {
  const traco = 11;
  const raio = (tamanho - traco) / 2;
  const circ = 2 * Math.PI * raio;

  const semDados = pct === null;
  const p = semDados ? 0 : Math.max(0, Math.min(100, pct));
  const cor = semDados ? null : corFrequencia(p);
  const offset = circ * (1 - p / 100);

  return (
    <div
      className="relative shrink-0"
      style={{ width: tamanho, height: tamanho }}
    >
      <svg
        width={tamanho}
        height={tamanho}
        viewBox={`0 0 ${tamanho} ${tamanho}`}
        className="-rotate-90"
      >
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          strokeWidth={traco}
          className="stroke-muted"
        />
        {!semDados ? (
          <circle
            cx={tamanho / 2}
            cy={tamanho / 2}
            r={raio}
            fill="none"
            strokeWidth={traco}
            strokeLinecap="round"
            stroke={cor!.forte}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 600ms ease" }}
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {semDados ? (
          <>
            <CalendarCheck className="size-6 text-muted-foreground/60" />
            <span className="mt-1 text-[11px] font-medium text-muted-foreground">
              sem agenda
            </span>
          </>
        ) : (
          <>
            <span
              className="text-3xl font-bold tabular-nums leading-none"
              style={{ color: cor!.texto }}
            >
              {p}
              <span className="text-lg font-semibold">%</span>
            </span>
            <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              frequência
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Frequência em uma linha + barra na cor do status (área do aluno).
 */
export function FrequenciaCard({
  pct,
  novo = false,
  esperado,
  presente,
  ultimaPresenca,
}: {
  pct: number | null;
  novo?: boolean;
  esperado: number;
  presente: number;
  ultimaPresenca?: string | null;
}) {
  if (pct === null) {
    return (
      <p className="text-sm text-muted-foreground">
        {novo
          ? "Ainda são poucas aulas para medir. A frequência aparece depois das primeiras 4 aulas."
          : "Sem horário fixo na grade: a frequência não é calculada."}
      </p>
    );
  }
  const cor = corFrequencia(pct);
  return (
    <div className="space-y-2">
      <p className="text-sm">
        Você veio a <strong className="tabular-nums">{presente} de {esperado}</strong> aulas{" "}
        <strong className="tabular-nums" style={{ color: cor.texto }}>({pct}%)</strong> nas últimas 8 semanas.
      </p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={`Frequência de ${pct}%`}>
        <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: cor.forte }} />
      </div>
      {ultimaPresenca ? <p className="text-xs text-muted-foreground">Última presença em {ultimaPresenca}.</p> : null}
    </div>
  );
}
