import { AlertTriangle, CheckCircle2, TrendingUp, Users } from "lucide-react";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { StatCard } from "@/components/ui-extra/stat-card";
import { formatDataExtenso } from "@/lib/formato";

export default function AdminDashboard() {
  const hoje = formatDataExtenso(new Date());

  return (
    <>
      <PageHeader
        titulo="Visão Geral"
        subtitulo={hoje[0]!.toUpperCase() + hoje.slice(1)}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          titulo="Alunos ativos"
          valor="—"
          icone={Users}
          tomIcone="primary"
          rodape="Disponível no módulo Alunos"
        />
        <StatCard
          titulo="Faturamento do mês"
          valor="—"
          icone={TrendingUp}
          tomIcone="sucesso"
          rodape="Disponível no Financeiro"
        />
        <StatCard
          titulo="Recebido"
          valor="—"
          icone={CheckCircle2}
          tomIcone="sucesso"
          rodape="Disponível no Financeiro"
        />
        <StatCard
          titulo="Inadimplentes"
          valor="—"
          icone={AlertTriangle}
          tomIcone="perigo"
          rodape="Disponível no Financeiro"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Faturamento — últimos 6 meses</CardTitle>
          </CardHeader>
          <PageEmpty
            icone={TrendingUp}
            titulo="Gráfico de faturamento"
            descricao="Os gráficos de evolução chegam com o módulo Financeiro."
          />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alunos do dia</CardTitle>
          </CardHeader>
          <PageEmpty
            icone={Users}
            titulo="Sem agenda ainda"
            descricao="A agenda do dia vem com Presença e Horários."
          />
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Mensalidades vencendo</CardTitle>
        </CardHeader>
        <PageEmpty
          icone={AlertTriangle}
          titulo="Nenhuma mensalidade para mostrar"
          descricao="A lista de cobranças aparece quando o Financeiro estiver ativo."
        />
      </Card>
    </>
  );
}
