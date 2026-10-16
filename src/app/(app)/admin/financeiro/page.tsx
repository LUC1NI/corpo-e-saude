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
import { requireUsuario } from "@/lib/auth";
import { agruparPorAluno, type CobrancaAberta } from "@/lib/cobranca";
import { formatBRL, formatDiaMes, formatMesExtenso, plural } from "@/lib/formato";
import { hojeISO } from "@/lib/financeiro";
import { executarRenovacao } from "@/lib/renovacao";
import { createClient } from "@/lib/supabase/server";
import { exigir } from "@/lib/utils";
import type { StatusPagamento as TStatusPagamento } from "@/lib/tipos";
import { addDays, format, parseISO } from "date-fns";

import { DespesaForm } from "./despesa-form";
import { ExcluirDespesaButton } from "./excluir-despesa-button";
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
  const inicioMes = `${hoje.slice(0, 7)}-01`; // fuso do estúdio, não do servidor

  // Renovação automática oportunista: sempre que o financeiro é aberto,
  // gera as cobranças que venceram e marca atrasos (idempotente). Em
  // produção o cron diário (/api/cron/renovar) faz o mesmo de madrugada.
  try {
    await executarRenovacao(supabase);
  } catch {
    // Sem renovação agora — a tela segue com os dados existentes.
  }

  const [abertosRes, mesRes, recebidoMesRes, despesasRes, categoriasRes] =
    await Promise.all([
    supabase
      .from("pagamentos")
      .select("id, aluno_id, competencia, vencimento, valor, status, alunos(nome, telefone)")
      .in("status", ["pendente", "vencido"])
      .order("vencimento")
      .limit(300),
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
      .select("id, descricao, valor, data, categorias:categorias_despesa(nome)")
      .gte("data", inicioMes)
      .order("data", { ascending: false })
      .limit(20),
    supabase.from("categorias_despesa").select("id, nome").order("nome"),
  ]);

  const abertos = exigir(abertosRes, "cobranças") as unknown as CobrancaAberta[];
  const mes = exigir(mesRes, "cobranças do mês") as {
    valor: number;
    status: TStatusPagamento;
  }[];
  const recebidoLista = exigir(recebidoMesRes, "recebimentos") as { valor: number }[];
  const despesas = exigir(despesasRes, "despesas") as unknown as DespesaItem[];
  const categorias = exigir(categoriasRes, "categorias") as {
    id: string;
    nome: string;
  }[];

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

  // A receber agora: atrasados + o que vence nos próximos 7 dias, por aluno.
  const ate7dias = format(addDays(parseISO(hoje), 7), "yyyy-MM-dd");
  const aReceber = agruparPorAluno(abertos.filter((p) => p.vencimento <= ate7dias), hoje);

  // Inadimplentes: alunos distintos com pelo menos uma cobrança vencida.
  const inadimplentes = aReceber.filter((g) => g.atrasado).length;

  return (
    <>
      <PageHeader
        titulo="Financeiro"
      />
      <NavFinanceiro ativa="/admin/financeiro" />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          titulo="Entrou no caixa"
          valor={formatBRL(recebidoMes)}
          icone={CheckCircle2}
          tomIcone="sucesso"
          rodape="Pagamentos recebidos neste mês"
          href="/admin/financeiro/recebimentos"
        />
        <StatCard
          titulo={`Mensalidades de ${formatMesExtenso(inicioMes)}`}
          valor={formatBRL(previstoMes)}
          icone={TrendingUp}
          tomIcone="primary"
          rodape={`${formatBRL(pagoDoMes)} pagas · ${formatBRL(abertoDoMes)} em aberto`}
          href="/admin/financeiro/mes"
        />
        <StatCard
          titulo="Em aberto"
          valor={formatBRL(totalAberto)}
          icone={Wallet}
          tomIcone="alerta"
          rodape={plural(abertos.length, "mensalidade", "mensalidades")}
          href="/admin/financeiro/em-aberto"
        />
        <StatCard
          titulo="Atrasados"
          valor={String(inadimplentes)}
          icone={AlertTriangle}
          tomIcone="perigo"
          rodape={
            inadimplentes > 0
              ? plural(inadimplentes, "aluno devendo", "alunos devendo")
              : "Nenhum aluno em atraso 🎉"
          }
          tomRodape={inadimplentes > 0 ? "perigo" : "sucesso"}
          href="/admin/financeiro/em-aberto"
        />
      </div>


      <Card id="despesa" className="mt-6 scroll-mt-20">
        <CardHeader>
          <CardTitle>Despesas do mês</CardTitle>
          <CardDescription>
            {despesas.length > 0
              ? `${formatBRL(totalDespesasMes)} em ${plural(despesas.length, "lançamento", "lançamentos")}.`
              : "Lance as despesas do estúdio para acompanhar o resultado do mês."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <DespesaForm categorias={categorias} />

          {despesas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma despesa lançada neste mês.
            </p>
          ) : (
            // Uma linha por despesa (no celular a tabela virava um card de 4 linhas cada).
            <ul className="-mx-4 divide-y border-t sm:mx-0 sm:rounded-lg sm:border">
              {despesas.map((d) => (
                <li key={d.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{d.descricao}</p>
                    <p className="text-sm text-muted-foreground">
                      {d.categorias?.nome ?? "Sem categoria"} · {formatDiaMes(d.data)}
                    </p>
                  </div>
                  <span className="font-heading font-bold whitespace-nowrap tabular-nums">{formatBRL(d.valor)}</span>
                  <ExcluirDespesaButton id={d.id} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
