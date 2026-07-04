import { format, startOfMonth } from "date-fns";
import { AlertTriangle, CheckCircle2, TrendingUp, Wallet } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { StatCard } from "@/components/ui-extra/stat-card";
import { StatusPagamento } from "@/components/ui-extra/status-badge";
import { TabelaResponsiva } from "@/components/ui-extra/tabela-responsiva";
import { requireUsuario } from "@/lib/auth";
import { formatBRL, formatData } from "@/lib/formato";
import { hojeISO, rotuloCompetencia } from "@/lib/financeiro";
import { createClient } from "@/lib/supabase/server";
import type { StatusPagamento as TStatusPagamento } from "@/lib/tipos";

import { BaixaButton } from "./baixa-button";
import { DespesaForm } from "./despesa-form";
import { ExcluirDespesaButton } from "./excluir-despesa-button";
import { ExcluirPagamentoButton } from "./excluir-pagamento-button";
import { GerarCobrancasButton } from "./gerar-cobrancas-button";

interface PagamentoAberto {
  id: string;
  aluno_id: string;
  competencia: string;
  vencimento: string;
  valor: number;
  status: TStatusPagamento;
  alunos: { nome: string } | null;
}

interface RecebidoItem {
  id: string;
  competencia: string;
  valor: number;
  data_pagamento: string | null;
  forma_pagamento: string | null;
  alunos: { nome: string } | null;
}

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

  const [
    { data: abertosData },
    { data: recebidosData },
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
      .select(
        "id, competencia, valor, data_pagamento, forma_pagamento, alunos(nome)",
      )
      .eq("status", "pago")
      .order("data_pagamento", { ascending: false })
      .limit(20),
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
      .order("data", { ascending: false })
      .limit(20),
    supabase.from("categorias_despesa").select("id, nome").order("nome"),
  ]);

  const abertos = (abertosData ?? []) as unknown as PagamentoAberto[];
  const recebidos = (recebidosData ?? []) as unknown as RecebidoItem[];
  const mes = (mesData ?? []) as { valor: number; status: TStatusPagamento }[];
  const despesas = (despesasData ?? []) as unknown as DespesaItem[];
  const categorias = (categoriasData ?? []) as { id: string; nome: string }[];

  const faturamentoMes = mes.reduce((s, p) => s + Number(p.valor), 0);
  const recebidoMes = ((recebidoMesData ?? []) as { valor: number }[]).reduce(
    (s, p) => s + Number(p.valor),
    0,
  );
  const totalAberto = abertos.reduce((s, p) => s + Number(p.valor), 0);
  const inadimplentes = new Set(
    abertos
      .filter((p) => p.status === "vencido" || p.vencimento < hoje)
      .map((p) => p.aluno_id),
  ).size;

  return (
    <>
      <PageHeader
        titulo="Financeiro"
        subtitulo="Mensalidades, inadimplência e despesas."
        acoes={<GerarCobrancasButton />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          titulo="Faturamento do mês"
          valor={formatBRL(faturamentoMes)}
          icone={TrendingUp}
          tomIcone="primary"
        />
        <StatCard
          titulo="Recebido no mês"
          valor={formatBRL(recebidoMes)}
          icone={CheckCircle2}
          tomIcone="sucesso"
        />
        <StatCard
          titulo="Em aberto"
          valor={formatBRL(totalAberto)}
          icone={Wallet}
          tomIcone="alerta"
        />
        <StatCard
          titulo="Inadimplentes"
          valor={String(inadimplentes)}
          icone={AlertTriangle}
          tomIcone="perigo"
        />
      </div>

      <Card className="mt-6 overflow-hidden p-0">
        <CardHeader className="p-5">
          <CardTitle>Mensalidades em aberto</CardTitle>
        </CardHeader>
        {abertos.length === 0 ? (
          <PageEmpty
            icone={CheckCircle2}
            titulo="Nenhuma mensalidade em aberto"
            descricao="As cobranças aparecem aqui quando você matricula um aluno (em Alunos) ou roda “Gerar cobranças”. Confirme cada recebimento pelo botão Confirmar."
          />
        ) : (
          <div className="p-3 sm:p-0">
            <TabelaResponsiva
              dados={abertos}
              getKey={(p) => p.id}
              colunas={[
                {
                  cabecalho: "Aluno",
                  principal: true,
                  celula: (p) => p.alunos?.nome ?? "-",
                },
                {
                  cabecalho: "Competência",
                  celula: (p) => rotuloCompetencia(p.competencia),
                },
                {
                  cabecalho: "Vencimento",
                  celula: (p) => {
                    const venc =
                      p.status === "pendente" && p.vencimento < hoje;
                    return (
                      <span className={venc ? "text-destructive" : undefined}>
                        {formatData(p.vencimento)}
                      </span>
                    );
                  },
                },
                { cabecalho: "Valor", celula: (p) => formatBRL(p.valor) },
                {
                  cabecalho: "Status",
                  celula: (p) => (
                    <StatusPagamento
                      status={
                        p.status === "pendente" && p.vencimento < hoje
                          ? "vencido"
                          : p.status
                      }
                    />
                  ),
                },
                {
                  cabecalho: "Ação",
                  alinhar: "right",
                  semRotuloMobile: true,
                  celula: (p) => (
                    <div className="flex items-center justify-end gap-1">
                      <BaixaButton pagamentoId={p.id} />
                      <ExcluirPagamentoButton pagamentoId={p.id} />
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Despesas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <DespesaForm categorias={categorias} />

          {despesas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma despesa lançada ainda.
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

      {/* Recebimentos: recolhível para não alongar a página. */}
      <Card className="mt-6 overflow-hidden p-0">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between p-5">
            <span className="font-heading text-base font-semibold">
              Recebimentos recentes
            </span>
            <span className="text-xs text-muted-foreground">
              {recebidos.length} · toque para ver
            </span>
          </summary>
          {recebidos.length === 0 ? (
            <PageEmpty
              icone={Wallet}
              titulo="Nenhum recebimento ainda"
              descricao="Os pagamentos confirmados aparecem aqui com a forma de pagamento."
            />
          ) : (
            <div className="border-t p-3 sm:p-0">
              <TabelaResponsiva
                dados={recebidos}
                getKey={(p) => p.id}
                colunas={[
                  {
                    cabecalho: "Aluno",
                    principal: true,
                    celula: (p) => p.alunos?.nome ?? "-",
                  },
                  {
                    cabecalho: "Competência",
                    celula: (p) => rotuloCompetencia(p.competencia),
                  },
                  {
                    cabecalho: "Pago em",
                    celula: (p) =>
                      p.data_pagamento ? formatData(p.data_pagamento) : "-",
                  },
                  {
                    cabecalho: "Forma",
                    celula: (p) => p.forma_pagamento ?? "-",
                  },
                  { cabecalho: "Valor", celula: (p) => formatBRL(p.valor) },
                ]}
              />
            </div>
          )}
        </details>
      </Card>
    </>
  );
}
