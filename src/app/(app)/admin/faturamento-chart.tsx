"use client";

import { Bar, BarChart, Cell, Tooltip, XAxis, YAxis } from "recharts";

import { ChartBox } from "@/components/ui-extra/chart-box";
import { formatBRL } from "@/lib/formato";

export interface PontoFaturamento {
  mes: string;
  valor: number;
}

export function FaturamentoChart({ dados }: { dados: PontoFaturamento[] }) {
  const ultimo = dados.length - 1;

  return (
    <ChartBox height={260}>
      {({ width, height }) => (
        <BarChart
          width={width}
          height={height}
          data={dados}
          margin={{ top: 16, right: 8, left: 8, bottom: 0 }}
        >
          <XAxis
            dataKey="mes"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "#5a6b80" }}
          />
          <YAxis hide />
          <Tooltip
            cursor={{ fill: "#f4f7fb" }}
            formatter={(v) => [formatBRL(Number(v)), "Recebido"]}
            labelStyle={{ color: "#18181a", fontWeight: 600 }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
          />
          <Bar dataKey="valor" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {dados.map((_, i) => (
              <Cell key={i} fill={i === ultimo ? "#0090D8" : "#cfe8f7"} />
            ))}
          </Bar>
        </BarChart>
      )}
    </ChartBox>
  );
}
