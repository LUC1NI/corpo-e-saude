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
import { StatusPagamento } from "@/components/ui-extra/status-badge";
import { TabelaResponsiva } from "@/components/ui-extra/tabela-responsiva";
import { requireUsuario } from "@/lib/auth";
import { formatBRL, formatData } from "@/lib/formato";
import { hojeISO, rotuloCompetencia } from "@/lib/financeiro";
import { executarRenovacao } from "@/lib/renovacao";
import { createClient } from "@/lib/supabase/server";
import type { StatusPagamento as TStatusPagamento } from "@/lib/tipos";

import { DespesaForm } from "./despesa-form";
import { ExcluirDespesaButton } from "./excluir-despesa-button";
import {
  MensalidadesAbertas,
  type PagamentoAberto,
} from "./mensalidades-abertas";
import { LinhaDetalhe, StatCardDialog } from "./stat-card-dialog";

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
      .select("valor, status, vencimento, alunos(nome)")
      .eq("competencia", inicioMes)
      .order("vencimento"),
    // Dinheiro que ENTROU no mês (pela data do pagamento, não da competência).
    supabase
      .from("pagamentos")
      .select("valor, competencia, data_pagamento, forma_pagamento, alunos(nome)")
      .eq("status", "pago")
      .gte("data_pagamento", inicioMes)
      .order("data_pagamento", { ascending: false }),
    supabase
      .from("despesas")
      .select("id, descricao, valor, data, categorias(nome)")
      .order("data", { ascending: false })
      .limit(20),
    supabase.from("categorias_despesa").select("id, nome").order("nome"),
  ]);

  const abertos = (abertosData ?? []) as unknown as PagamentoAberto[];
  const recebidos = (recebidosData ?? []) as unknown as RecebidoItem[];
  const mes = (mesData ?? []) as unknown as {
    valor: number;
    status: TStatusPagamento;
    vencimento: string;
    alunos: { nome: string } | null;
  }[];
  const recebidoMesLista = (recebidoMesData ?? []) as unknown as {
    valor: number;
    competencia: string;
    data_pagamento: string | null;
    forma_pagamento: string | null;
    alunos: { nome: string } | null;
  }[];
  const despesas = (despesasData ?? []) as unknown as DespesaItem[];
  const categorias = (categoriasData ?? []) as { id: string; nome: string }[];

  const faturamentoMes = mes.reduce((s, p) => s + Number(p.valor), 0);
  const recebidoMes = recebidoMesLista.reduce((s, p) => s + Number(p.valor), 0);
  const totalAberto = abertos.reduce((s, p) => s + Number(p.valor), 0);

  // Inadimplentes: alunos com pelo menos uma mensalidade vencida — com o total
  // devido de cada um, para o detalhamento.
  const vencidosPorAluno = new Map<string, { nome: string; valor: number }>();
  for (const p of abertos) {
    if (p.status !== "vencido" && p.vencimento >= hoje) continue;
    const atual = vencidosPorAluno.get(p.aluno_id) ?? {
      nome: p.alunos?.nome ?? "Aluno",
      valor: 0,
    };
    atual.valor += Number(p.valor);
    vencidosPorAluno.set(p.aluno_id, atual);
  }
  const listaInadimplentes = [...vencidosPorAluno.values()].sort(
    (a, b) => b.valor - a.valor,
  );
  const inadimplentes = listaInadimplentes.length;

  return (
    <>
      <PageHeader
        titulo="Financeiro"
        subtitulo="Mensalidades, inadimplência e despesas."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCardDialog
          titulo="Faturamento do mês"
          valor={formatBRL(faturamentoMes)}
          icone={TrendingUp}
          tomIcone="primary"
          descricao={`Mensalidades com competência de ${rotuloCompetencia(inicioMes)} (pagas + em aberto).`}
        >
          {mes.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma mensalidade neste mês ainda.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {mes.map((p, i) => (
                <LinhaDetalhe
                  key={i}
                  titulo={p.alunos?.nome ?? "Aluno"}
                  subtitulo={`Vence ${formatData(p.vencimento)}`}
                  valor={formatBRL(p.valor)}
                  badge={<StatusPagamento status={p.status} />}
                />
              ))}
            </ul>
          )}
        </StatCardDialog>

        <StatCardDialog
          titulo="Recebido no mês"
          valor={formatBRL(recebidoMes)}
          icone={CheckCircle2}
          tomIcone="sucesso"
          descricao="Pagamentos confirmados neste mês (pela data em que entraram)."
        >
          {recebidoMesLista.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhum pagamento recebido neste mês ainda.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {recebidoMesLista.map((p, i) => (
                <LinhaDetalhe
                  key={i}
                  titulo={p.alunos?.nome ?? "Aluno"}
                  subtitulo={`${rotuloCompetencia(p.competencia)}${
                    p.data_pagamento ? ` · pago ${formatData(p.data_pagamento)}` : ""
                  }${p.forma_pagamento ? ` · ${p.forma_pagamento}` : ""}`}
                  valor={formatBRL(p.valor)}
                />
              ))}
            </ul>
          )}
        </StatCardDialog>

        <StatCardDialog
          titulo="Em aberto"
          valor={formatBRL(totalAberto)}
          icone={Wallet}
          tomIcone="alerta"
          descricao="Mensalidades pendentes e vencidas de todos os alunos."
        >
          {abertos.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Tudo em dia! Nenhuma mensalidade em aberto.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {abertos.map((p) => (
                <LinhaDetalhe
                  key={p.id}
                  titulo={p.alunos?.nome ?? "Aluno"}
                  subtitulo={`${rotuloCompetencia(p.competencia)} · vence ${formatData(p.vencimento)}`}
                  valor={formatBRL(p.valor)}
                  badge={<StatusPagamento status={p.status} />}
                />
              ))}
            </ul>
          )}
        </StatCardDialog>

        <StatCardDialog
          titulo="Inadimplentes"
          valor={String(inadimplentes)}
          icone={AlertTriangle}
          tomIcone="perigo"
          descricao="Alunos com pelo menos uma mensalidade vencida, e o total devido de cada um."
        >
          {listaInadimplentes.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhum aluno inadimplente. 🎉
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {listaInadimplentes.map((a, i) => (
                <LinhaDetalhe
                  key={i}
                  titulo={a.nome}
                  subtitulo="Total vencido"
                  valor={formatBRL(a.valor)}
                />
              ))}
            </ul>
          )}
        </StatCardDialog>
      </div>

      <MensalidadesAbertas abertos={abertos} hoje={hoje} />

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
