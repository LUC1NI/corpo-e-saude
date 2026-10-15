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
 * Barra de referência do degradê (vermelho→verde) com um marcador na posição
 * do aluno. Reforça visualmente onde ele está na escala.
 */
export function FrequenciaBarra({ pct }: { pct: number }) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div className="w-full">
      <div className="relative h-2.5 w-full rounded-full bg-[linear-gradient(90deg,hsl(0_82%_50%),hsl(45_90%_50%),hsl(90_75%_45%),hsl(130_72%_42%))]">
        <div
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white shadow-md ring-1 ring-black/10"
          style={{ left: `${p}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-medium text-muted-foreground">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

/**
 * Cartão completo de frequência para a página de detalhe do aluno:
 * anel + faixa/degradê + resumo textual.
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
  const cor = pct === null ? null : corFrequencia(pct);
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
      <FrequenciaRing pct={pct} />
      <div className="w-full flex-1 space-y-3 text-center sm:text-left">
        <div>
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={
              cor
                ? { backgroundColor: cor.suave, color: cor.texto }
                : undefined
            }
          >
            {rotuloFrequencia(pct, novo)}
          </span>
        </div>
        {pct !== null ? <FrequenciaBarra pct={pct} /> : null}
        <p className="text-sm text-muted-foreground">
          {pct === null && novo ? (
            <>
              Ainda são poucas aulas para medir a frequência. Em duas semanas
              ela aparece aqui.
            </>
          ) : pct === null ? (
            <>
              Este aluno não tem horários fixos na grade, então a frequência não
              é calculada. As presenças avulsas continuam registradas.
            </>
          ) : (
            <>
              Compareceu a <strong className="text-foreground">{presente}</strong>{" "}
              de <strong className="text-foreground">{esperado}</strong>{" "}
              {esperado === 1 ? "aula prevista" : "aulas previstas"} nas últimas 8 semanas.
              {ultimaPresenca ? (
                <>
                  {" "}
                  Última presença em{" "}
                  <span className="font-medium text-foreground">
                    {ultimaPresenca}
                  </span>
                  .
                </>
              ) : null}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
