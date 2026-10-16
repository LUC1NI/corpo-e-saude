"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

import { ChartBox } from "@/components/ui-extra/chart-box";
import { cn } from "@/lib/utils";

export interface PontoAvaliacao {
  data: string; // rótulo (dd/mm)
  peso: number | null;
  gordura: number | null;
}

const METRICAS = {
  peso: { rotulo: "Peso", unidade: "kg", cor: "#0090D8" },
  gordura: { rotulo: "% de gordura", unidade: "%", cor: "#033373" },
} as const;
type Metrica = keyof typeof METRICAS;

const fmt = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

/**
 * Evolução de UMA grandeza por vez (peso em kg ou % de gordura): duas
 * unidades no mesmo eixo confundiam. O último valor vem destacado.
 */
export function AvaliacaoChart({ dados }: { dados: PontoAvaliacao[] }) {
  const disponiveis = (Object.keys(METRICAS) as Metrica[]).filter(
    (m) => dados.filter((d) => d[m] != null).length >= 2,
  );
  const [metrica, setMetrica] = useState<Metrica>(disponiveis[0] ?? "peso");
  const m = METRICAS[metrica];
  const serie = dados
    .filter((d) => d[metrica] != null)
    .map((d) => ({ data: d.data, valor: Number(d[metrica]) }));
  const ultimo = serie.at(-1);
  const gradId = `grad-${metrica}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {disponiveis.length > 1 ? (
          <div role="group" aria-label="O que mostrar no gráfico" className="inline-flex rounded-xl bg-muted p-1">
            {disponiveis.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={k === metrica}
                onClick={() => setMetrica(k)}
                className={cn(
                  "min-h-9 rounded-lg px-3 text-sm font-medium transition-colors",
                  k === metrica ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {METRICAS[k].rotulo}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm font-semibold">{m.rotulo}</p>
        )}
        {ultimo ? (
          <p className="text-sm text-muted-foreground">
            Atual: <strong className="text-foreground tabular-nums">{fmt(ultimo.valor)} {m.unidade}</strong>
          </p>
        ) : null}
      </div>

      <ChartBox height={220}>
        {({ width, height }) => (
          <AreaChart width={width} height={height} data={serie} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={m.cor} stopOpacity={0.18} />
                <stop offset="100%" stopColor={m.cor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#edf1f6" vertical={false} />
            <XAxis dataKey="data" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 12, fill: "#8a93a1" }} />
            {/* Domínio ajustado aos dados (com folga): começando em zero a evolução some. */}
            <YAxis
              domain={[(min: number) => Math.floor(min - 2), (max: number) => Math.ceil(max + 2)]}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => `${Math.round(v)} ${m.unidade}`}
              tick={{ fontSize: 12, fill: "#8a93a1" }}
            />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #e3e8ef", fontSize: 12 }}
              formatter={(v) => [`${fmt(Number(v))} ${m.unidade}`, m.rotulo]}
            />
            <Area
              type="monotone"
              dataKey="valor"
              stroke={m.cor}
              strokeWidth={2.5}
              fill={`url(#${gradId})`}
              isAnimationActive={false}
              dot={(p: { cx?: number; cy?: number; index?: number }) =>
                p.index === serie.length - 1 ? (
                  <circle key="ultimo" cx={p.cx} cy={p.cy} r={5} fill={m.cor} stroke="#fff" strokeWidth={2} />
                ) : (
                  <circle key={p.index} cx={p.cx} cy={p.cy} r={2.5} fill={m.cor} />
                )
              }
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        )}
      </ChartBox>
    </div>
  );
}
