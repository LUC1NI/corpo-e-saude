import { AlertTriangle, CalendarClock, CheckCircle2, Wallet } from "lucide-react";
import Link from "@/components/ui-extra/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { StatCard } from "@/components/ui-extra/stat-card";
import { requireUsuario } from "@/lib/auth";
import { hojeISO } from "@/lib/financeiro";
import { formatBRL, formatData, formatMesAno, plural } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";
import type { StatusPagamento as TStatusPagamento } from "@/lib/tipos";

import { BaixaButton } from "../baixa-button";
import { ExcluirPagamentoButton } from "../excluir-pagamento-button";
import { NavFinanceiro } from "../nav-financeiro";
import { exigir } from "@/lib/utils";

interface Aberto {
  id: string;
  aluno_id: string;
  competencia: string;
  vencimento: string;
  valor: number;
  status: TStatusPagamento;
  alunos: { nome: string } | null;
}

function ListaCobrancas({ itens }: { itens: Aberto[] }) {
  return (
    <ul className="divide-y rounded-lg border">
      {itens.map((p) => (
        // No celular: nome + valor em cima, botões embaixo (alvos de toque
        // confortáveis). No desktop: tudo em uma linha.
        <li
          key={p.id}
          className="px-4 py-3 sm:flex sm:items-center sm:justify-between sm:gap-3"
        >
          <div className="flex items-center justify-between gap-3 sm:min-w-0 sm:flex-1">
            <Link
              href={`/admin/alunos/${p.aluno_id}`}
              className="min-w-0 transition-colors hover:text-primary"
            >
              <p className="truncate text-sm font-medium">
                {p.alunos?.nome ?? "Aluno"}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatMesAno(p.competencia)} · vence{" "}
                {formatData(p.vencimento)}
              </p>
            </Link>
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {formatBRL(p.valor)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-end gap-1.5 sm:mt-0 sm:shrink-0">
            <BaixaButton pagamentoId={p.id} aluno={p.alunos?.nome ?? "aluno"} competencia={p.competencia} valor={Number(p.valor)} />
            <ExcluirPagamentoButton pagamentoId={p.id} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function EmAbertoPage() {
  await requireUsuario(["admin"]);
  const supabase = await createClient();
  const hoje = hojeISO();

  const res = await supabase
    .from("pagamentos")
    .select("id, aluno_id, competencia, vencimento, valor, status, alunos(nome)")
    .in("status", ["pendente", "vencido"])
    .order("vencimento")
    .limit(300);

  const abertos = exigir(res, "lista") as unknown as Aberto[];
  const vencidas = abertos.filter(
    (p) => p.status === "vencido" || p.vencimento < hoje,
  );
  const aVencer = abertos.filter(
    (p) => p.status !== "vencido" && p.vencimento >= hoje,
  );

  const totalAberto = abertos.reduce((s, p) => s + Number(p.valor), 0);
  const totalVencido = vencidas.reduce((s, p) => s + Number(p.valor), 0);
  const totalAVencer = totalAberto - totalVencido;

  return (
    <>
      <PageHeader
        titulo="Em aberto"
        subtitulo="Tudo o que ainda não entrou no caixa — confirme o pagamento direto daqui."
      />
      <NavFinanceiro ativa="/admin/financeiro/em-aberto" />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          titulo="Total em aberto"
          valor={formatBRL(totalAberto)}
          icone={Wallet}
          tomIcone="alerta"
          rodape={plural(abertos.length, "cobrança", "cobranças")}
          className="col-span-2 sm:col-span-1"
        />
        <StatCard
          titulo="Vencidas"
          valor={formatBRL(totalVencido)}
          icone={AlertTriangle}
          tomIcone="perigo"
          rodape={plural(vencidas.length, "cobrança atrasada", "cobranças atrasadas")}
          tomRodape={vencidas.length > 0 ? "perigo" : "neutro"}
        />
        <StatCard
          titulo="A vencer"
          valor={formatBRL(totalAVencer)}
          icone={CalendarClock}
          tomIcone="primary"
          rodape={`${plural(aVencer.length, "cobrança", "cobranças")} dentro do prazo`}
        />
      </div>

      {abertos.length === 0 ? (
        <Card>
          <PageEmpty
            icone={CheckCircle2}
            titulo="Tudo em dia!"
            descricao="Nenhuma mensalidade pendente ou vencida. 🎉"
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {vencidas.length > 0 ? (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="size-4" />
                  Vencidas ({vencidas.length})
                </CardTitle>
                <CardDescription>
                  Já passaram do vencimento — priorize a cobrança. Toque no
                  nome para abrir o aluno.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ListaCobrancas itens={vencidas} />
              </CardContent>
            </Card>
          ) : null}

          {aVencer.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="size-4 text-primary" />A vencer (
                  {aVencer.length})
                </CardTitle>
                <CardDescription>
                  Dentro do prazo. Você pode confirmar antecipado se o aluno já
                  pagou.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ListaCobrancas itens={aVencer} />
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </>
  );
}
