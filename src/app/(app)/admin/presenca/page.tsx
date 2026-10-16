import { format, isValid, parseISO } from "date-fns";
import { CalendarCheck, Clock, History, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "@/components/ui-extra/link";

import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import { AvatarIniciais } from "@/components/ui-extra/avatar-iniciais";
import { FrequenciaBadge } from "@/components/ui-extra/frequencia";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { PresencasAgrupadas } from "@/components/ui-extra/presencas-agrupadas";
import { requireUsuario } from "@/lib/auth";
import { agoraNoEstudio, hojeISO } from "@/lib/financeiro";
import { formatData, plural } from "@/lib/formato";
import { getFrequenciaAlunos } from "@/lib/frequencia";
import { createClient } from "@/lib/supabase/server";
import { DIAS_SEMANA, horaCurta } from "@/lib/tipos";
import { cn } from "@/lib/utils";

import { MarcarAulaDialog } from "./marcar-aula-dialog";
import { SeletorData } from "./seletor-data";

interface PresencaLinha {
  id: string;
  data: string;
  hora: string | null;
  alunos: { nome: string } | null;
  professores: { nome: string } | null;
}

type Aba = "aulas" | "frequencia" | "historico";

const ABAS: { id: Aba; rotulo: string; icone: LucideIcon }[] = [
  { id: "aulas", rotulo: "Aulas do dia", icone: CalendarCheck },
  { id: "frequencia", rotulo: "Frequência", icone: TrendingUp },
  { id: "historico", rotulo: "Histórico", icone: History },
];

export default async function AdminPresencaPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; aba?: string; vazios?: string }>;
}) {
  await requireUsuario(["admin"]);
  const sp = await searchParams;
  const aba: Aba = ABAS.some((a) => a.id === sp.aba) ? (sp.aba as Aba) : "aulas";
  // Só aceita data real ("2026-02-31" cai para hoje).
  const d = sp.data && parseISO(sp.data);
  const data = d && isValid(d) && format(d, "yyyy-MM-dd") === sp.data ? sp.data : undefined;
  const sufixoData = data ? `data=${data}` : "";

  return (
    <>
      <PageHeader
        titulo="Presença"
        subtitulo="Quem veio em cada aula — dá para lançar também dias anteriores."
      />
      <nav aria-label="Seções da presença" className="mb-6 flex flex-wrap gap-1.5">
        {ABAS.map((a) => {
          const ativa = a.id === aba;
          return (
            <Link
              key={a.id}
              href={`/admin/presenca?${[a.id === "aulas" ? "" : `aba=${a.id}`, sufixoData].filter(Boolean).join("&")}`}
              aria-current={ativa ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-sm whitespace-nowrap transition-all sm:min-h-9",
                ativa
                  ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                  : "border bg-card font-medium text-foreground/80 shadow-sm hover:border-primary/40 hover:text-foreground",
              )}
            >
              <a.icone className={cn("size-3.5", ativa ? "text-primary-foreground" : "text-primary")} />
              {a.rotulo}
            </Link>
          );
        })}
      </nav>

      {aba === "aulas" ? (
        <AulasDoDia data={data} mostrarVazios={sp.vazios === "1"} />
      ) : aba === "frequencia" ? (
        <Frequencia />
      ) : (
        <Historico />
      )}
    </>
  );
}

async function AulasDoDia({ data: dataParam, mostrarVazios }: { data?: string; mostrarVazios: boolean }) {
  const supabase = await createClient();
  const hoje = hojeISO();
  const data = dataParam ?? hoje; // já validada na página
  const diaSel = new Date(`${data}T00:00:00`).getDay();
  const ehHoje = data === hoje;
  const agora = format(agoraNoEstudio(), "HH:mm");

  const [{ data: horsDiaData }, { data: vincData }, { data: presDiaData }] = await Promise.all([
    supabase
      .from("horarios")
      .select("id, hora_inicio, hora_fim, capacidade, professor_id, professores(nome)")
      .eq("dia_semana", diaSel)
      .order("hora_inicio"),
    supabase.from("aluno_horarios").select("horario_id, alunos(id, nome, status)"),
    supabase.from("presencas").select("aluno_id, professor_id, hora").eq("data", data),
  ]);

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

  const presDia = (presDiaData ?? []) as { aluno_id: string; professor_id: string | null; hora: string | null }[];
  const aulasDia = horsDia.map((h) => ({
    ...h,
    alunos: (alunosPorHorario.get(h.id) ?? []).sort((a, b) => a.nome.localeCompare(b.nome)),
    presentes: presDia
      .filter((p) => p.professor_id === h.professor_id && p.hora === h.hora_inicio)
      .map((p) => p.aluno_id),
    emAndamento: ehHoje && h.hora_inicio.slice(0, 5) <= agora && agora < h.hora_fim.slice(0, 5),
  }));
  // Horário sem aluno fixo nem presença é ruído: fica escondido atrás de um link
  // (ainda dá para abrir e lançar um avulso).
  const comAlunos = aulasDia.filter((a) => a.alunos.length > 0 || a.presentes.length > 0);
  const vazios = aulasDia.length - comAlunos.length;
  const lista = mostrarVazios ? aulasDia : comAlunos;
  // Hoje: a aula em andamento e as próximas primeiro; as que já acabaram vão
  // para o fim (continuam lá para lançar presença atrasada).
  const acabou = (a: (typeof aulasDia)[number]) => ehHoje && a.hora_fim.slice(0, 5) <= agora;
  const visiveis = [...lista.filter((a) => !acabou(a)), ...lista.filter(acabou)];

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {ehHoje ? "Hoje" : formatData(data)} · {DIAS_SEMANA[diaSel]}
        </CardTitle>
        <CardAction>
          <span className="text-sm text-muted-foreground">
            {plural(presDia.length, "presença", "presenças")}
          </span>
        </CardAction>
      </CardHeader>
      <div className="px-6 pb-2">
        <SeletorData data={data} />
      </div>
      {visiveis.length === 0 ? (
        <PageEmpty
          icone={Clock}
          titulo={aulasDia.length === 0 ? "Nenhuma aula neste dia" : "Nenhum aluno agendado neste dia"}
          descricao={
            aulasDia.length === 0
              ? "Não há horários cadastrados para este dia na grade dos professores."
              : "Os horários existem, mas nenhum tem aluno fixo."
          }
        />
      ) : (
        <ul className="mx-6 mb-2 divide-y rounded-xl border">
          {visiveis.map((a) => {
            return (
              <li
                key={a.id}
                className={cn(
                  "flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3",
                  a.emAndamento && "bg-primary/5",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold tabular-nums">
                    {horaCurta(a.hora_inicio)}–{horaCurta(a.hora_fim)}
                    {a.emAndamento ? (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                        agora
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {a.professores?.nome ?? "-"} ·{" "}
                    {a.presentes.length > a.alunos.length
                      ? `${a.presentes.length} presentes · ${a.alunos.length} agendados`
                      : `${a.presentes.length} de ${a.alunos.length} presentes`}
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
              </li>
            );
          })}
        </ul>
      )}
      {vazios > 0 ? (
        <div className="px-6 pb-5">
          <Link
            href={`/admin/presenca?data=${data}${mostrarVazios ? "" : "&vazios=1"}`}
            className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline sm:min-h-0"
          >
            {mostrarVazios
              ? "Esconder horários sem aluno"
              : `Mostrar ${plural(vazios, "horário sem aluno", "horários sem aluno")}`}
          </Link>
        </div>
      ) : (
        <div className="pb-4" />
      )}
    </Card>
  );
}

async function Frequencia() {
  const supabase = await createClient();
  const hoje = hojeISO();
  const { data } = await supabase.from("alunos").select("id, nome").eq("status", "ativo").order("nome");
  const alunosAtivos = (data ?? []) as { id: string; nome: string }[];
  const freqMap = await getFrequenciaAlunos(supabase, alunosAtivos.map((a) => a.id), hoje);
  // Menor frequência primeiro: é quem precisa de atenção.
  const frequencias = alunosAtivos
    .map((a) => ({ ...a, freq: freqMap.get(a.id) }))
    .filter((a) => a.freq && a.freq.pct !== null)
    .sort((a, b) => (a.freq!.pct ?? 0) - (b.freq!.pct ?? 0));

  return (
    <Card className="overflow-hidden p-0">
      <CardHeader className="p-5">
        <CardTitle>Frequência dos alunos</CardTitle>
        <CardAction>
          <span className="text-xs text-muted-foreground">últimas 8 semanas · menor primeiro</span>
        </CardAction>
      </CardHeader>
      {frequencias.length === 0 ? (
        <PageEmpty
          icone={TrendingUp}
          titulo="Ainda sem dados de frequência"
          descricao="A frequência aparece quando os alunos têm horários fixos e presenças marcadas."
        />
      ) : (
        <ul className="divide-y border-t">
          {frequencias.map((a) => (
            <li key={a.id}>
              <Link
                href={`/admin/alunos/${a.id}`}
                className="flex items-center justify-between gap-3 px-5 py-2.5 transition-colors hover:bg-muted/50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <AvatarIniciais nome={a.nome} tamanho="sm" />
                  <span className="truncate text-sm font-medium">{a.nome}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {a.freq!.presente}/{a.freq!.esperado}
                  </span>
                  <FrequenciaBadge pct={a.freq!.pct} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

async function Historico() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("presencas")
    .select("id, data, hora, alunos(nome), professores(nome)")
    .order("data", { ascending: false })
    .order("criado_em", { ascending: false })
    .limit(50);
  const recentes = (data ?? []) as unknown as PresencaLinha[];

  return (
    <Card className="overflow-hidden p-0">
      <CardHeader className="p-5">
        <CardTitle>Presenças recentes</CardTitle>
        <CardAction>
          <span className="text-xs text-muted-foreground">últimas 50 · por dia</span>
        </CardAction>
      </CardHeader>
      {recentes.length === 0 ? (
        <PageEmpty
          icone={CalendarCheck}
          titulo="Nenhuma presença registrada"
          descricao="As presenças marcadas pelos professores aparecem aqui."
        />
      ) : (
        <div className="border-t">
          <PresencasAgrupadas
            itens={recentes}
            hoje={hojeISO()}
            renderPrincipal={(p) => p.alunos?.nome ?? "-"}
            renderSecundario={(p) => `${p.professores?.nome ?? "—"}${p.hora ? ` · ${horaCurta(p.hora)}` : ""}`}
          />
        </div>
      )}
    </Card>
  );
}
