"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartBox } from "@/components/ui-extra/chart-box";
import { formatBRL } from "@/lib/formato";

export interface PontoFluxo {
  /** Rótulo do mês (ex.: "jul"). */
  mes: string;
  recebido: number;
  despesas: number;
}

// Paleta validada (CVD + contraste ≥3:1 sobre card claro):
// recebido = ciano da marca; despesas = âmbar escuro.
const COR_RECEBIDO = "#0090D8";
const COR_DESPESAS = "#D97706";

/** Eixo em formato compacto: 1.2k em vez de R$ 1.200,00 (economiza espaço). */
function compacto(v: number): string {
  if (v >= 1000) return `${(v / 1000).toLocaleString("pt-BR")}k`;
  return String(v);
}

/**
 * Evolução mensal de caixa: barras agrupadas de recebido × despesas.
 * Mostra de relance se o estúdio está entrando mais do que saindo.
 */
export function GraficoFluxo({ dados }: { dados: PontoFluxo[] }) {
  return (
    <ChartBox height={280}>
      {({ width, height }) => (
        <BarChart
          width={width}
          height={height}
          data={dados}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          barGap={2}
          barCategoryGap="28%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#eef3f9"
            vertical={false}
          />
          <XAxis
            dataKey="mes"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "#5a6b80" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={compacto}
            tick={{ fontSize: 12, fill: "#5a6b80" }}
          />
          <Tooltip
            cursor={{ fill: "rgba(3, 51, 115, 0.04)" }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
            formatter={(v, nome) => [formatBRL(Number(v ?? 0)), nome]}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
          />
          <Bar
            dataKey="recebido"
            name="Recebido"
            fill={COR_RECEBIDO}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="despesas"
            name="Despesas"
            fill={COR_DESPESAS}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      )}
    </ChartBox>
  );
}
