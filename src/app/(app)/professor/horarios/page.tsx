import { Clock } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { StatusBadge } from "@/components/ui-extra/status-badge";
import { requireUsuario } from "@/lib/auth";
import { hojeISO } from "@/lib/financeiro";
import { getProfessorAtual } from "@/lib/professor";
import { createClient } from "@/lib/supabase/server";
import { DIAS_SEMANA, horaCurta, type Horario } from "@/lib/tipos";

import { ExcluirHorarioButton } from "./excluir-horario-button";
import { HorarioForm } from "./horario-form";

export default async function HorariosPage() {
  await requireUsuario(["professor"]);
  const professor = await getProfessorAtual();
  if (!professor) {
    return (
      <>
        <PageHeader titulo="Horários" />
        <PageEmpty
          icone={Clock}
          titulo="Perfil de professor não encontrado"
          descricao="Fale com o administrador do studio."
        />
      </>
    );
  }

  const supabase = await createClient();
  const hoje = hojeISO();
  const diaHoje = new Date().getDay();

  const [{ data: horariosData }, { data: presencasHojeData }] =
    await Promise.all([
      supabase
        .from("horarios")
        .select("*")
        .eq("professor_id", professor.id)
        .order("dia_semana")
        .order("hora_inicio"),
      supabase
        .from("presencas")
        .select("hora")
        .eq("professor_id", professor.id)
        .eq("data", hoje),
    ]);

  const horarios = (horariosData ?? []) as Horario[];
  const presencasHoje = (presencasHojeData ?? []) as { hora: string | null }[];

  function presentesNoSlot(h: Horario): number {
    return presencasHoje.filter(
      (p) => p.hora && p.hora >= h.hora_inicio && p.hora < h.hora_fim,
    ).length;
  }

  const porDia = DIAS_SEMANA.map((nome, dia) => ({
    dia,
    nome,
    slots: horarios.filter((h) => h.dia_semana === dia),
  })).filter((d) => d.slots.length > 0);

  return (
    <>
      <PageHeader
        titulo="Horários"
        subtitulo="Sua grade semanal e a ocupação de cada horário."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Adicionar horário</CardTitle>
        </CardHeader>
        <CardContent>
          <HorarioForm />
        </CardContent>
      </Card>

      {porDia.length === 0 ? (
        <PageEmpty
          icone={Clock}
          titulo="Nenhum horário cadastrado"
          descricao="Adicione os horários da sua grade acima."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {porDia.map(({ dia, nome, slots }) => (
            <Card
              key={dia}
              className={dia === diaHoje ? "border-primary/40" : ""}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  {nome}
                  {dia === diaHoje ? (
                    <StatusBadge tom="info">Hoje</StatusBadge>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {slots.map((h) => {
                  const presentes = presentesNoSlot(h);
                  return (
                    <div
                      key={h.id}
                      className="flex items-center justify-between gap-2 rounded-lg border bg-secondary/40 px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {horaCurta(h.hora_inicio)}–{horaCurta(h.hora_fim)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {dia === diaHoje
                            ? `${presentes} presente(s) hoje`
                            : "—"}
                          {h.capacidade ? ` · cap. ${h.capacidade}` : ""}
                        </p>
                      </div>
                      <ExcluirHorarioButton id={h.id} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
