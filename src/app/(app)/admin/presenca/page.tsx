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

import { MarcarAulaDialog } from "./marcar-aula-dialog";
import { SeletorData } from "./seletor-data";

interface PresencaLinha {
  id: string;
  data: string;
  hora: string | null;
  alunos: { nome: string } | null;
  professores: { nome: string } | null;
}

export default async function AdminPresencaPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  await requireUsuario(["admin"]);
  const supabase = await createClient();
  const hoje = hojeISO();
  const sp = await searchParams;
  const data = sp.data ?? hoje;
  const diaSel = new Date(`${data}T00:00:00`).getDay();

  const [
    { count: presencasHoje },
    { count: presencasDia },
    { data: recentesData },
    { data: horsDiaData },
    { data: vincData },
    { data: presDiaData },
  ] = await Promise.all([
    supabase
      .from("presencas")
      .select("id", { count: "exact", head: true })
      .eq("data", hoje),
    supabase
      .from("presencas")
      .select("id", { count: "exact", head: true })
      .eq("data", data),
    supabase
      .from("presencas")
      .select("id, data, hora, alunos(nome), professores(nome)")
      .order("data", { ascending: false })
      .order("criado_em", { ascending: false })
      .limit(50),
    supabase
      .from("horarios")
      .select("id, hora_inicio, hora_fim, capacidade, professor_id, professores(nome)")
      .eq("dia_semana", diaSel)
      .order("hora_inicio"),
    supabase.from("aluno_horarios").select("horario_id, alunos(id, nome, status)"),
    supabase
      .from("presencas")
      .select("aluno_id, professor_id, hora")
      .eq("data", data),
  ]);

  const recentes = (recentesData ?? []) as unknown as PresencaLinha[];

  // Aulas do dia selecionado (todos os professores).
  const horsDia = (horsDiaData ?? []) as unknown as {
    id: string;
    hora_inicio: string;
    hora_fim: string;
    capacidade: number | null;
    professor_id: string;
    professores: { nome: string } | null;
  }[];

  // Alunos agendados por horário (só ativos), para o roster de marcação.
  const alunosPorHorario = new Map<string, { id: string; nome: string }[]>();
  for (const v of (vincData ?? []) as unknown as {
    horario_id: string;
    alunos: { id: string; nome: string; status: string } | null;
  }[]) {
    if (!v.alunos || v.alunos.status !== "ativo") continue;
    const lista = alunosPorHorario.get(v.horario_id) ?? [];
    lista.push({ id: v.alunos.id, nome: v.alunos.nome });
    alunosPorHorario.set(v.horario_id, lista);
  }

  const presDia = (presDiaData ?? []) as {
    aluno_id: string;
    professor_id: string | null;
    hora: string | null;
  }[];
  const aulasDia = horsDia.map((h) => {
    const alunos = (alunosPorHorario.get(h.id) ?? []).sort((a, b) =>
      a.nome.localeCompare(b.nome),
    );
    const presentes = presDia
      .filter(
        (p) => p.professor_id === h.professor_id && p.hora === h.hora_inicio,
      )
      .map((p) => p.aluno_id);
    return { ...h, alunos, presentes };
  });

  const ehHoje = data === hoje;

  return (
    <>
      <PageHeader
        titulo="Presença"
        subtitulo="Acompanhe e lance presenças do studio — inclusive de dias anteriores."
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
          <CardTitle>Aulas · {DIAS_SEMANA[diaSel]}</CardTitle>
        </CardHeader>
        <div className="px-6 pb-2">
          <SeletorData data={data} />
          <p className="mt-2 text-sm text-muted-foreground">
            {ehHoje ? "Hoje" : formatData(data)} · {presencasDia ?? 0} presença(s)
            registrada(s). Toque em “Marcar presença” para lançar (funciona
            mesmo após o horário).
          </p>
        </div>
        {aulasDia.length === 0 ? (
          <PageEmpty
            icone={Clock}
            titulo="Nenhuma aula neste dia"
            descricao="Não há horários cadastrados para este dia na grade dos professores."
          />
        ) : (
          <div className="grid gap-3 px-6 pb-6 sm:grid-cols-2 xl:grid-cols-3">
            {aulasDia.map((a) => {
              const lotada =
                a.capacidade != null && a.presentes.length >= a.capacidade;
              return (
                <div
                  key={a.id}
                  className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm"
                >
                  <div>
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
                        {a.presentes.length}
                        {a.capacidade != null ? `/${a.capacidade}` : ""}{" "}
                        presente(s)
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {a.professores?.nome ?? "-"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {a.alunos.length} aluno(s) agendado(s)
                    </p>
                  </div>
                  <MarcarAulaDialog
                    data={data}
                    hora={a.hora_inicio}
                    professorId={a.professor_id}
                    professorNome={a.professores?.nome ?? "Professor"}
                    rotuloHorario={`${horaCurta(a.hora_inicio)}–${horaCurta(a.hora_fim)}`}
                    alunos={a.alunos}
                    presentes={a.presentes}
                  />
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
                  celula: (p) => p.alunos?.nome ?? "-",
                },
                {
                  cabecalho: "Professor",
                  celula: (p) => p.professores?.nome ?? "-",
                },
                { cabecalho: "Data", celula: (p) => formatData(p.data) },
                {
                  cabecalho: "Horário",
                  celula: (p) => (p.hora ? horaCurta(p.hora) : "-"),
                },
              ]}
            />
          </div>
        )}
      </Card>
    </>
  );
}
