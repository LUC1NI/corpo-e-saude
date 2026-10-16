import { AlertTriangle, CalendarClock, CheckCircle2, Wallet } from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { StatCard } from "@/components/ui-extra/stat-card";
import { requireUsuario } from "@/lib/auth";
import { hojeISO } from "@/lib/financeiro";
import { agruparPorAluno, type CobrancaAberta } from "@/lib/cobranca";
import { formatBRL, plural } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";

import { NavFinanceiro } from "../nav-financeiro";
import { ReceberPorAluno } from "../receber-por-aluno";
import { exigir } from "@/lib/utils";

export default async function EmAbertoPage() {
  await requireUsuario(["admin"]);
  const supabase = await createClient();
  const hoje = hojeISO();

  const res = await supabase
    .from("pagamentos")
    .select("id, aluno_id, competencia, vencimento, valor, status, alunos(nome, telefone)")
    .in("status", ["pendente", "vencido"])
    .order("vencimento")
    .limit(300);

  const abertos = exigir(res, "lista") as unknown as CobrancaAberta[];
  const vencidas = abertos.filter((p) => p.vencimento < hoje);
  const aVencer = abertos.filter((p) => p.vencimento >= hoje);
  // Uma linha por aluno; quem tem qualquer mês atrasado vai para "Atrasadas".
  const grupos = agruparPorAluno(abertos, hoje);
  const gruposAtrasados = grupos.filter((g) => g.atrasado);
  const gruposEmDia = grupos.filter((g) => !g.atrasado);

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
          {gruposAtrasados.length > 0 ? (
            <Card className="gap-0 overflow-hidden border-red-200 p-0">
              <CardHeader className="p-5">
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="size-4" />
                  Atrasadas · {plural(gruposAtrasados.length, "aluno", "alunos")}
                </CardTitle>
                <CardDescription>Priorize a cobrança. O valor soma todos os meses em aberto do aluno.</CardDescription>
              </CardHeader>
              <ReceberPorAluno grupos={gruposAtrasados} hoje={hoje} className="border-t" />
            </Card>
          ) : null}

          {gruposEmDia.length > 0 ? (
            <Card className="gap-0 overflow-hidden p-0">
              <CardHeader className="p-5">
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="size-4 text-primary" />
                  No prazo · {plural(gruposEmDia.length, "aluno", "alunos")}
                </CardTitle>
                <CardDescription>Dentro do prazo. Dá para confirmar antecipado se o aluno já pagou.</CardDescription>
              </CardHeader>
              <ReceberPorAluno grupos={gruposEmDia} hoje={hoje} className="border-t" />
            </Card>
          ) : null}
        </div>
      )}
    </>
  );
}
