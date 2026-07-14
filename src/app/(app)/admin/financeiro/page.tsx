import { format, startOfMonth } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Wallet,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui-extra/page-header";
import { StatCard } from "@/components/ui-extra/stat-card";
import { TabelaResponsiva } from "@/components/ui-extra/tabela-responsiva";
import { requireUsuario } from "@/lib/auth";
import { formatBRL, formatData } from "@/lib/formato";
import { hojeISO } from "@/lib/financeiro";
import { executarRenovacao } from "@/lib/renovacao";
import { createClient } from "@/lib/supabase/server";
import type { StatusPagamento as TStatusPagamento } from "@/lib/tipos";

import { DespesaForm } from "./despesa-form";
import { ExcluirDespesaButton } from "./excluir-despesa-button";
import {
  MensalidadesAbertas,
  type PagamentoAberto,
} from "./mensalidades-abertas";
import { NavFinanceiro } from "./nav-financeiro";

interface DespesaItem {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  categorias: { nome: string } | null;
}

export default async function FinanceiroPage() {
  await requireUsuario(["admin"]);
  const supabase = await createClient();
  const hoje = hojeISO();
  const inicioMes = format(startOfMonth(new Date()), "yyyy-MM-dd");

  // Renovação automática oportunista: sempre que o financeiro é aberto,
  // gera as cobranças que venceram e marca atrasos (idempotente). Em
  // produção o cron diário (/api/cron/renovar) faz o mesmo de madrugada.
  try {
    await executarRenovacao(supabase);
  } catch {
    // Sem renovação agora — a tela segue com os dados existentes.
  }

  const [
    { data: abertosData },
    { data: mesData },
    { data: recebidoMesData },
    { data: despesasData },
    { data: categoriasData },
  ] = await Promise.all([
    supabase
      .from("pagamentos")
      .select("id, aluno_id, competencia, vencimento, valor, status, alunos(nome)")
      .in("status", ["pendente", "vencido"])
      .order("vencimento")
      .limit(100),
    supabase
      .from("pagamentos")
      .select("valor, status")
      .eq("competencia", inicioMes),
    // Dinheiro que ENTROU no mês (pela data do pagamento, não da competência).
    supabase
      .from("pagamentos")
      .select("valor")
      .eq("status", "pago")
      .gte("data_pagamento", inicioMes),
    supabase
      .from("despesas")
      .select("id, descricao, valor, data, categorias(nome)")
      .gte("data", inicioMes)
      .order("data", { ascending: false })
      .limit(20),
    supabase.from("categorias_despesa").select("id, nome").order("nome"),
  ]);

  const abertos = (abertosData ?? []) as unknown as PagamentoAberto[];
  const mes = (mesData ?? []) as { valor: number; status: TStatusPagamento }[];
  const recebidoLista = (recebidoMesData ?? []) as { valor: number }[];
  const despesas = (despesasData ?? []) as unknown as DespesaItem[];
  const categorias = (categoriasData ?? []) as { id: string; nome: string }[];

  // "Previsto" = competência do mês (pago + em aberto). Mostramos a quebra no
  // rodapé para nunca passar a impressão de que previsto é dinheiro em caixa.
  const previstoMes = mes.reduce((s, p) => s + Number(p.valor), 0);
  const pagoDoMes = mes
    .filter((p) => p.status === "pago")
    .reduce((s, p) => s + Number(p.valor), 0);
  const abertoDoMes = previstoMes - pagoDoMes;
  const recebidoMes = recebidoLista.reduce((s, p) => s + Number(p.valor), 0);
  const totalAberto = abertos.reduce((s, p) => s + Number(p.valor), 0);
  const totalDespesasMes = despesas.reduce((s, d) => s + Number(d.valor), 0);

  // Inadimplentes: alunos distintos com pelo menos uma cobrança vencida.
  const inadimplentes = new Set(
    abertos
      .filter((p) => p.status === "vencido" || p.vencimento < hoje)
      .map((p) => p.aluno_id),
  ).size;

  return (
    <>
      <PageHeader
        titulo="Financeiro"
        subtitulo="Visão geral do caixa. Toque em um indicador para abrir o detalhe."
      />
      <NavFinanceiro ativa="/admin/financeiro" />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          titulo="Recebido no mês"
          valor={formatBRL(recebidoMes)}
          icone={CheckCircle2}
          tomIcone="sucesso"
          rodape="Dinheiro que entrou no caixa"
          href="/admin/financeiro/recebimentos"
        />
        <StatCard
          titulo="Previsto no mês"
          valor={formatBRL(previstoMes)}
          icone={TrendingUp}
          tomIcone="primary"
          rodape={`${formatBRL(pagoDoMes)} recebido · ${formatBRL(abertoDoMes)} em aberto`}
          href="/admin/financeiro/mes"
        />
        <StatCard
          titulo="Em aberto"
          valor={formatBRL(totalAberto)}
          icone={Wallet}
          tomIcone="alerta"
          rodape={`${abertos.length} cobrança(s) pendente(s)`}
          href="/admin/financeiro/em-aberto"
        />
        <StatCard
          titulo="Inadimplentes"
          valor={String(inadimplentes)}
          icone={AlertTriangle}
          tomIcone="perigo"
          rodape={
            inadimplentes > 0
              ? "Alunos com mensalidade vencida"
              : "Nenhum aluno em atraso 🎉"
          }
          tomRodape={inadimplentes > 0 ? "perigo" : "sucesso"}
          href="/admin/financeiro/inadimplentes"
        />
      </div>

      <MensalidadesAbertas abertos={abertos} hoje={hoje} />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Despesas do mês</CardTitle>
          <CardDescription>
            {despesas.length > 0
              ? `${formatBRL(totalDespesasMes)} em ${despesas.length} lançamento(s). Lance rápido abaixo.`
              : "Lance as despesas do studio para acompanhar o resultado do mês."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <DespesaForm categorias={categorias} />

          {despesas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma despesa lançada neste mês.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border p-3 sm:p-0">
              <TabelaResponsiva
                dados={despesas}
                getKey={(d) => d.id}
                colunas={[
                  {
                    cabecalho: "Descrição",
                    principal: true,
                    celula: (d) => d.descricao,
                  },
                  {
                    cabecalho: "Categoria",
                    celula: (d) => d.categorias?.nome ?? "-",
                  },
                  { cabecalho: "Data", celula: (d) => formatData(d.data) },
                  { cabecalho: "Valor", celula: (d) => formatBRL(d.valor) },
                  {
                    cabecalho: "Ação",
                    alinhar: "right",
                    semRotuloMobile: true,
                    celula: (d) => <ExcluirDespesaButton id={d.id} />,
                  },
                ]}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
