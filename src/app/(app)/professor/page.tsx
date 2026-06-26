import { Activity, CalendarCheck, Dumbbell, Users } from "lucide-react";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { StatCard } from "@/components/ui-extra/stat-card";
import { requireUsuario } from "@/lib/auth";
import { formatDataExtenso } from "@/lib/formato";

export default async function ProfessorDashboard() {
  const usuario = await requireUsuario(["professor"]);
  const hoje = formatDataExtenso(new Date());

  return (
    <>
      <PageHeader
        titulo={`Olá, ${usuario.nome.split(" ")[0]}`}
        subtitulo={hoje[0]!.toUpperCase() + hoje.slice(1)}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard titulo="Meus alunos" valor="—" icone={Users} rodape="Sua carteira" />
        <StatCard
          titulo="Treinos ativos"
          valor="—"
          icone={Dumbbell}
          rodape="Disponível no módulo Treinos"
        />
        <StatCard
          titulo="Avaliações no mês"
          valor="—"
          icone={Activity}
          tomIcone="sucesso"
          rodape="Disponível na Avaliação Física"
        />
        <StatCard
          titulo="Presenças hoje"
          valor="—"
          icone={CalendarCheck}
          rodape="Disponível em Presença"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Alunos do dia</CardTitle>
        </CardHeader>
        <PageEmpty
          icone={CalendarCheck}
          titulo="Sem agenda ainda"
          descricao="A agenda chega com os módulos de Presença e Horários."
        />
      </Card>
    </>
  );
}
