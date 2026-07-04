import { CalendarCheck, Clock } from "lucide-react";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { StatCard } from "@/components/ui-extra/stat-card";
import { TabelaResponsiva } from "@/components/ui-extra/tabela-responsiva";
import { requireUsuario } from "@/lib/auth";
import { hojeISO } from "@/lib/financeiro";
import { formatData } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";
import { DIAS_SEMANA, horaCurta } from "@/lib/tipos";

interface PresencaLinha {
  id: string;
  data: string;
  hora: string | null;
  alunos: { nome: string } | null;
  professores: { nome: string } | null;
}

export default async function AdminPresencaPage() {
  await requireUsuario(["admin"]);
  const supabase = await createClient();
  const hoje = hojeISO();
  const diaHoje = new Date(`${hoje}T00:00:00`).getDay();

  const [
    { count: presencasHoje },
    { data: recentesData },
    { data: horsHojeData },
    { data: vincData },
    { data: presHojeData },
  ] = await Promise.all([
    supabase
      .from("presencas")
      .select("id", { count: "exact", head: true })
      .eq("data", hoje),
    supabase
      .from("presencas")
      .select("id, data, hora, alunos(nome), professores(nome)")
      .order("data", { ascending: false })
      .order("criado_em", { ascending: false })
      .limit(50),
    supabase
      .from("horarios")
      .select("id, hora_inicio, hora_fim, capacidade, professor_id, professores(nome)")
      .eq("dia_semana", diaHoje)
      .order("hora_inicio"),
    supabase.from("aluno_horarios").select("horario_id"),
    supabase
      .from("presencas")
      .select("professor_id, hora")
      .eq("data", hoje),
  ]);

  const recentes = (recentesData ?? []) as unknown as PresencaLinha[];

  // Ocupação das aulas de hoje (todos os professores).
  const horsHoje = (horsHojeData ?? []) as unknown as {
    id: string;
    hora_inicio: string;
    hora_fim: string;
    capacidade: number | null;
    professor_id: string;
    professores: { nome: string } | null;
  }[];
  const atribuidosPorHorario = new Map<string, number>();
  for (const v of (vincData ?? []) as { horario_id: string }[]) {
    atribuidosPorHorario.set(
      v.horario_id,
      (atribuidosPorHorario.get(v.horario_id) ?? 0) + 1,
    );
  }
  const presHoje = (presHojeData ?? []) as {
    professor_id: string | null;
    hora: string | null;
  }[];
  const aulasHoje = horsHoje.map((h) => ({
    ...h,
    atribuidos: atribuidosPorHorario.get(h.id) ?? 0,
    presentes: presHoje.filter(
      (p) => p.professor_id === h.professor_id && p.hora === h.hora_inicio,
    ).length,
  }));

  return (
    <>
      <PageHeader
        titulo="Presença"
        subtitulo="Acompanhamento das presenças do studio."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          titulo="Presenças hoje"
          valor={String(presencasHoje ?? 0)}
          icone={CalendarCheck}
          tomIcone="primary"
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Aulas de hoje — {DIAS_SEMANA[diaHoje]}</CardTitle>
        </CardHeader>
        {aulasHoje.length === 0 ? (
          <PageEmpty
            icone={Clock}
            titulo="Nenhuma aula hoje"
            descricao="Não há horários cadastrados para hoje na grade dos professores."
          />
        ) : (
          <div className="grid gap-3 px-6 pb-6 sm:grid-cols-2 xl:grid-cols-3">
            {aulasHoje.map((a) => {
              const lotada = a.capacidade != null && a.presentes >= a.capacidade;
              return (
                <div
                  key={a.id}
                  className="rounded-xl border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">
                      {horaCurta(a.hora_inicio)}–{horaCurta(a.hora_fim)}
                    </p>
                    <span
                      className={
                        lotada
                          ? "text-xs font-medium text-amber-600"
                          : "text-xs text-muted-foreground"
                      }
                    >
                      {a.presentes}
                      {a.capacidade != null ? `/${a.capacidade}` : ""} presente(s)
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {a.professores?.nome ?? "—"}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {a.atribuidos} aluno(s) agendado(s)
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="overflow-hidden p-0">
        <CardHeader className="p-5">
          <CardTitle>Presenças recentes</CardTitle>
        </CardHeader>
        {recentes.length === 0 ? (
          <PageEmpty
            icone={CalendarCheck}
            titulo="Nenhuma presença registrada"
            descricao="As presenças marcadas pelos professores aparecem aqui."
          />
        ) : (
          <div className="p-3 sm:p-0">
            <TabelaResponsiva
              dados={recentes}
              getKey={(p) => p.id}
              colunas={[
                {
                  cabecalho: "Aluno",
                  principal: true,
                  celula: (p) => p.alunos?.nome ?? "—",
                },
                {
                  cabecalho: "Professor",
                  celula: (p) => p.professores?.nome ?? "—",
                },
                { cabecalho: "Data", celula: (p) => formatData(p.data) },
                {
                  cabecalho: "Horário",
                  celula: (p) => (p.hora ? horaCurta(p.hora) : "—"),
                },
              ]}
            />
          </div>
        )}
      </Card>
    </>
  );
}
