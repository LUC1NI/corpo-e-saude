import { format, parseISO } from "date-fns";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { AvaliacaoChart, type PontoAvaliacao } from "./avaliacao-chart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TabelaResponsiva } from "@/components/ui-extra/tabela-responsiva";
import { formatData } from "@/lib/formato";
import { MEDIDAS_CAMPOS } from "@/lib/schemas";
import type { AvaliacaoFisica } from "@/lib/tipos";
import { cn } from "@/lib/utils";

const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

function Delta({ valor, unidade }: { valor: number | null; unidade: string }) {
  if (valor == null || Math.abs(valor) < 0.05) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="size-3" />
        estável
      </span>
    );
  }
  const desceu = valor < 0;
  const Icone = desceu ? TrendingDown : TrendingUp;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        desceu ? "text-emerald-600" : "text-amber-600",
      )}
    >
      <Icone className="size-3" />
      {desceu ? "" : "+"}
      {fmt.format(valor)} {unidade}
    </span>
  );
}

function StatCard({
  titulo,
  valor,
  unidade,
  delta,
  deltaUnidade,
}: {
  titulo: string;
  valor: number | null;
  unidade: string;
  delta: number | null;
  deltaUnidade: string;
}) {
  return (
    <Card className="gap-2 p-4">
      <p className="text-xs font-medium text-muted-foreground">{titulo}</p>
      <p className="font-heading text-2xl font-bold">
        {valor != null ? fmt.format(valor) : "—"}
        {valor != null ? (
          <span className="ml-1 text-sm font-medium text-muted-foreground">
            {unidade}
          </span>
        ) : null}
      </p>
      <Delta valor={delta} unidade={deltaUnidade} />
    </Card>
  );
}

/**
 * Resumo visual de evolução do aluno: cartões com os valores atuais e a
 * variação desde a primeira avaliação, gráfico em destaque, medidas atuais e
 * o histórico completo recolhível.
 */
export function EvolucaoResumo({
  avaliacoes,
}: {
  avaliacoes: AvaliacaoFisica[];
}) {
  // Vem em ordem decrescente (mais recente primeiro).
  const atual = avaliacoes[0]!;
  const primeira = avaliacoes[avaliacoes.length - 1]!;

  const delta = (campo: "peso" | "percentual_gordura" | "imc") => {
    const a = atual[campo];
    const b = primeira[campo];
    if (a == null || b == null || avaliacoes.length < 2) return null;
    return a - b;
  };

  const asc = [...avaliacoes].reverse();
  const pontos: PontoAvaliacao[] = asc.map((a) => ({
    data: format(parseISO(a.data), "dd/MM"),
    peso: a.peso,
    gordura: a.percentual_gordura,
  }));

  const medidasAtuais = MEDIDAS_CAMPOS.filter(
    (m) => atual.medidas?.[m.chave] != null,
  );

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Última avaliação em {formatData(atual.data)}
        {avaliacoes.length > 1
          ? ` · ${avaliacoes.length} avaliações registradas`
          : null}
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          titulo="Peso"
          valor={atual.peso}
          unidade="kg"
          delta={delta("peso")}
          deltaUnidade="kg"
        />
        <StatCard
          titulo="% de gordura"
          valor={atual.percentual_gordura}
          unidade="%"
          delta={delta("percentual_gordura")}
          deltaUnidade="%"
        />
        <StatCard
          titulo="IMC"
          valor={atual.imc}
          unidade=""
          delta={delta("imc")}
          deltaUnidade=""
        />
      </div>

      {avaliacoes.length >= 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Evolução de peso e % de gordura</CardTitle>
          </CardHeader>
          <CardContent>
            <AvaliacaoChart dados={pontos} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            O gráfico aparece a partir da segunda avaliação.
          </CardContent>
        </Card>
      )}

      {medidasAtuais.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Medidas atuais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {medidasAtuais.map((m) => (
                <div
                  key={m.chave}
                  className="rounded-lg border bg-secondary/30 p-3"
                >
                  <p className="text-xs text-muted-foreground">{m.rotulo}</p>
                  <p className="font-heading text-lg font-bold">
                    {fmt.format(atual.medidas![m.chave]!)}
                    <span className="ml-1 text-xs font-medium text-muted-foreground">
                      cm
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {avaliacoes.length > 1 ? (
        <details className="group rounded-xl border bg-card">
          <summary className="flex cursor-pointer items-center justify-between p-4 text-sm font-medium">
            Histórico completo
            <span className="text-xs text-muted-foreground group-open:hidden">
              ver
            </span>
            <span className="hidden text-xs text-muted-foreground group-open:inline">
              ocultar
            </span>
          </summary>
          <div className="border-t p-3 sm:p-0">
            <TabelaResponsiva
              dados={avaliacoes}
              getKey={(a) => a.id}
              colunas={[
                {
                  cabecalho: "Data",
                  principal: true,
                  celula: (a) => formatData(a.data),
                },
                {
                  cabecalho: "Peso",
                  celula: (a) =>
                    a.peso != null ? `${fmt.format(a.peso)} kg` : "—",
                },
                {
                  cabecalho: "IMC",
                  celula: (a) => (a.imc != null ? fmt.format(a.imc) : "—"),
                },
                {
                  cabecalho: "% Gord.",
                  celula: (a) =>
                    a.percentual_gordura != null
                      ? `${fmt.format(a.percentual_gordura)}%`
                      : "—",
                },
              ]}
            />
          </div>
        </details>
      ) : null}
    </div>
  );
}
