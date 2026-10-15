import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "@/components/ui-extra/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui-extra/page-header";
import { StatCard } from "@/components/ui-extra/stat-card";
import { StatusPagamento } from "@/components/ui-extra/status-badge";
import { requireUsuario } from "@/lib/auth";
import { hojeISO, rotuloCompetencia } from "@/lib/financeiro";
import { formatBRL, formatData, plural } from "@/lib/formato";
import { exigir } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import type { StatusPagamento as TStatusPagamento } from "@/lib/tipos";

import { GraficoFluxo, type PontoFluxo } from "../grafico-fluxo";
import { NavFinanceiro } from "../nav-financeiro";
import { mesesAte, resolverMes, rotuloMesCurto } from "../periodo";
import { SeletorMes } from "../seletor-mes";

const MESES_GRAFICO = 6;

export default async function RelatorioMesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  await requireUsuario(["admin"]);
  const supabase = await createClient();
  const hoje = hojeISO();
  const sp = await searchParams;
  const periodo = resolverMes(sp.mes);

  // Janela do gráfico: os 6 meses que terminam no mês selecionado.
  const mesesJanela = mesesAte(periodo, MESES_GRAFICO);
  const inicioJanela = mesesJanela[0]!;

  const [mesRes, pagosRes, despesasRes] = await Promise.all([
      supabase
        .from("pagamentos")
        .select("valor, status, vencimento, aluno_id, alunos(nome)")
        .eq("competencia", periodo.inicio)
        .order("vencimento"),
      // Pagos na janela inteira: alimenta o gráfico E a lista do mês.
      supabase
        .from("pagamentos")
        .select(
          "valor, competencia, data_pagamento, forma_pagamento, aluno_id, alunos(nome)",
        )
        .eq("status", "pago")
        .gte("data_pagamento", inicioJanela)
        .lt("data_pagamento", periodo.fimExclusivo)
        .order("data_pagamento", { ascending: false }),
      supabase
        .from("despesas")
        .select("descricao, valor, data, categorias:categorias_despesa(nome)")
        .gte("data", inicioJanela)
        .lt("data", periodo.fimExclusivo)
        .order("data", { ascending: false }),
    ]);

  const mes = exigir(mesRes, "cobranças do mês") as unknown as {
    valor: number;
    status: TStatusPagamento;
    vencimento: string;
    aluno_id: string;
    alunos: { nome: string } | null;
  }[];
  const pagosJanela = exigir(pagosRes, "recebimentos") as unknown as {
    valor: number;
    competencia: string;
    data_pagamento: string | null;
    forma_pagamento: string | null;
    aluno_id: string;
    alunos: { nome: string } | null;
  }[];
  const despesasJanela = exigir(despesasRes, "despesas") as unknown as {
    descricao: string;
    valor: number;
    data: string;
    categorias: { nome: string } | null;
  }[];

  // Recortes do mês selecionado.
  const recebidosMes = pagosJanela.filter(
    (p) => (p.data_pagamento ?? "") >= periodo.inicio,
  );
  const despesasMes = despesasJanela.filter((d) => d.data >= periodo.inicio);

  const previsto = mes.reduce((s, p) => s + Number(p.valor), 0);
  const pago = mes
    .filter((p) => p.status === "pago")
    .reduce((s, p) => s + Number(p.valor), 0);
  const aberto = previsto - pago;
  const recebidoMes = recebidosMes.reduce((s, p) => s + Number(p.valor), 0);
  const totalDespesas = despesasMes.reduce((s, d) => s + Number(d.valor), 0);
  const resultado = recebidoMes - totalDespesas;
  const pctRecebido = previsto > 0 ? Math.round((pago / previsto) * 100) : 0;

  // Série do gráfico: soma de recebido e despesas por mês da janela.
  const porMes = new Map<string, PontoFluxo>();
  for (const inicio of mesesJanela) {
    porMes.set(inicio.slice(0, 7), {
      mes: rotuloMesCurto(inicio),
      recebido: 0,
      despesas: 0,
    });
  }
  for (const p of pagosJanela) {
    const ponto = porMes.get((p.data_pagamento ?? "").slice(0, 7));
    if (ponto) ponto.recebido += Number(p.valor);
  }
  for (const d of despesasJanela) {
    const ponto = porMes.get(d.data.slice(0, 7));
    if (ponto) ponto.despesas += Number(d.valor);
  }
  const serieFluxo = [...porMes.values()];

  return (
    <>
      <PageHeader
        titulo="Relatório do mês"
        subtitulo="Previsto, recebido, despesas e resultado — mês a mês."
        acoes={<SeletorMes periodo={periodo} base="/admin/financeiro/mes" />}
      />
      <NavFinanceiro ativa="/admin/financeiro/mes" />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          titulo="Recebido no mês"
          valor={formatBRL(recebidoMes)}
          icone={CheckCircle2}
          tomIcone="sucesso"
          rodape="Dinheiro que entrou no caixa"
          href={`/admin/financeiro/recebimentos?mes=${periodo.chave}`}
        />
        <StatCard
          titulo="Previsto no mês"
          valor={formatBRL(previsto)}
          icone={TrendingUp}
          tomIcone="primary"
          rodape={`${formatBRL(pago)} recebido · ${formatBRL(aberto)} em aberto`}
        />
        <StatCard
          titulo="Despesas do mês"
          valor={formatBRL(totalDespesas)}
          icone={Receipt}
          tomIcone="alerta"
          rodape={plural(despesasMes.length, "lançamento", "lançamentos")}
        />
        <StatCard
          titulo="Resultado (caixa)"
          valor={formatBRL(resultado)}
          icone={Wallet}
          tomIcone={resultado >= 0 ? "sucesso" : "perigo"}
          rodape="Recebido − despesas"
          tomRodape={resultado >= 0 ? "sucesso" : "perigo"}
        />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-5">
        {/* Evolução: últimos 6 meses de caixa. */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Evolução do caixa</CardTitle>
            <CardDescription>
              Recebido × despesas nos últimos {MESES_GRAFICO} meses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GraficoFluxo dados={serieFluxo} />
          </CardContent>
        </Card>

        {/* Composição do previsto do mês. */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Composição do previsto</CardTitle>
            <CardDescription>
              Quanto das mensalidades de {rotuloCompetencia(periodo.inicio)} já
              virou caixa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Já recebido</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {formatBRL(pago)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Em aberto</p>
                  <p className="text-xl font-bold text-amber-600">
                    {formatBRL(aberto)}
                  </p>
                </div>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-amber-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${pctRecebido}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {pctRecebido}% do previsto já foi recebido.
              </p>
            </div>

            {aberto > 0 ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <p className="text-xs leading-relaxed text-amber-900">
                  <strong>{formatBRL(aberto)}</strong> ainda não entraram no
                  caixa. Esse valor só conta como recebido após a baixa.
                </p>
              </div>
            ) : previsto > 0 ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <p className="text-xs leading-relaxed text-emerald-900">
                  Todas as mensalidades do mês foram recebidas. 🎉
                </p>
              </div>
            ) : null}

            <Link
              href={`/admin/financeiro/em-aberto`}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
            >
              Ver cobranças em aberto
              <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              Mensalidades de {rotuloCompetencia(periodo.inicio)}
            </CardTitle>
            <CardDescription>
              Todas as cobranças com competência neste mês.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma mensalidade com competência neste mês.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {mes.map((p, i) => (
                  <li key={i}>
                    <Link
                      href={`/admin/alunos/${p.aluno_id}`}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {p.alunos?.nome ?? "Aluno"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Vence {formatData(p.vencimento)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusPagamento
                          status={
                            p.status === "pendente" && p.vencimento < hoje
                              ? "vencido"
                              : p.status
                          }
                        />
                        <span className="text-sm font-semibold tabular-nums">
                          {formatBRL(p.valor)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="size-4 text-amber-600" />
              Despesas do mês
            </CardTitle>
            <CardDescription>
              Lançamentos de {rotuloCompetencia(periodo.inicio)}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {despesasMes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma despesa lançada neste mês.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {despesasMes.map((d, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {d.descricao}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {d.categorias?.nome ?? "Sem categoria"} ·{" "}
                        {formatData(d.data)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-amber-700">
                      − {formatBRL(d.valor)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
