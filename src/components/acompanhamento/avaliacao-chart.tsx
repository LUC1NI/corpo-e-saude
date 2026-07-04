"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface PontoAvaliacao {
  data: string; // rótulo (dd/mm)
  peso: number | null;
  gordura: number | null;
}

export function AvaliacaoChart({ dados }: { dados: PontoAvaliacao[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={dados} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef3f9" vertical={false} />
        <XAxis
          dataKey="data"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "#5a6b80" }}
        />
        {/* Domínio ajustado aos dados (com folga): começando em zero as
            linhas ficam achatadas e a evolução some. */}
        <YAxis
          yAxisId="peso"
          domain={[
            (min: number) => Math.floor(min - 2),
            (max: number) => Math.ceil(max + 2),
          ]}
          tickLine={false}
          axisLine={false}
          width={36}
          tickFormatter={(v: number) => String(Math.round(v))}
          tick={{ fontSize: 12, fill: "#5a6b80" }}
        />
        <YAxis
          yAxisId="gordura"
          domain={[
            (min: number) => Math.floor(min - 2),
            (max: number) => Math.ceil(max + 2),
          ]}
          orientation="right"
          hide
        />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            fontSize: 12,
          }}
          formatter={(v, nome) => [
            v == null ? "-" : `${v}${nome === "Peso" ? " kg" : "%"}`,
            nome,
          ]}
        />
        <Line
          yAxisId="peso"
          type="monotone"
          dataKey="peso"
          name="Peso"
          stroke="#0090D8"
          strokeWidth={2.5}
          dot={{ r: 3 }}
          connectNulls
        />
        <Line
          yAxisId="gordura"
          type="monotone"
          dataKey="gordura"
          name="% Gordura"
          stroke="#033373"
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={{ r: 3 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
