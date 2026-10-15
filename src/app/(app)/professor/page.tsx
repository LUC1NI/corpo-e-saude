import { format, parseISO, subDays } from "date-fns";
import {
  AlertTriangle,
  CalendarCheck,
  ChevronRight,
  ClipboardList,
  Clock,
  Dumbbell,
  Users,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AvatarIniciais } from "@/components/ui-extra/avatar-iniciais";
import Link from "@/components/ui-extra/link";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { requireUsuario } from "@/lib/auth";
import { agoraNoEstudio, hojeISO } from "@/lib/financeiro";
import { formatDataExtenso, plural } from "@/lib/formato";
import { dividirAulasDoDia } from "@/lib/historico-aulas";
import { getProfessorAtual } from "@/lib/professor";
import { createClient } from "@/lib/supabase/server";
import { horaCurta } from "@/lib/tipos";
import { cn } from "@/lib/utils";

type Aula = { id: string; hora_inicio: string; hora_fim: string; capacidade: number | null };
type Aluno = { id: string; nome: string };

/** Avaliação física "vencida" depois de tantos dias. */
const DIAS_REAVALIAR = 90;
/** Aluno online "sumido" depois de tantos dias sem treinar. */
const DIAS_SEM_TREINAR = 7;

function Turma({ alunos, max = 5 }: { alunos: Aluno[]; max?: number }) {
  if (alunos.length === 0) return <span className="text-sm opacity-80">Sem alunos agendados</span>;
  return (
    <span className="flex items-center gap-2">
      <span className="flex -space-x-2">
        {alunos.slice(0, max).map((a) => (
          <AvatarIniciais key={a.id} nome={a.nome} tamanho="sm" className="ring-2 ring-white" />
        ))}
      </span>
      <span className="truncate text-sm">
        {alunos.map((a) => a.nome.split(" ")[0]).join(", ")}
      </span>
    </span>
  );
}

export default async function ProfessorHoje() {
  const usuario = await requireUsuario(["professor"]);
  const agora = agoraNoEstudio();
  const hoje = hojeISO();
  const hojeExtenso = formatDataExtenso(agora);
  const titulo = `Olá, ${usuario.nome.split(" ")[0]}`;
  const subtitulo = hojeExtenso[0]!.toUpperCase() + hojeExtenso.slice(1);
  const professor = await getProfessorAtual();

  if (!professor) {
    return (
      <>
        <PageHeader titulo={titulo} subtitulo={subtitulo} />
        <PageEmpty
          icone={Users}
          titulo="Perfil de professor não encontrado"
          descricao="Fale com o administrador do studio."
        />
      </>
    );
  }

  const supabase = await createClient();
  const limiteAvaliacao = format(subDays(parseISO(hoje), DIAS_REAVALIAR), "yyyy-MM-dd");
  const limiteTreino = subDays(agora, DIAS_SEM_TREINAR).toISOString();

  const [
    { data: aulasData },
    { data: presData },
    { data: alunosData },
    { data: anamData },
    { data: avalData },
    { data: fichasData },
    { data: execData },
  ] = await Promise.all([
    supabase
      .from("horarios")
      .select("id, hora_inicio, hora_fim, capacidade, aluno_horarios(alunos(id, nome))")
      .eq("professor_id", professor.id)
      .eq("dia_semana", agora.getDay())
      .order("hora_inicio"),
    supabase.from("presencas").select("aluno_id, hora").eq("professor_id", professor.id).eq("data", hoje),
    supabase
      .from("alunos")
      .select("id, nome, tipo")
      .eq("professor_id", professor.id)
      .eq("status", "ativo")
      .order("nome"),
    supabase.from("anamneses").select("aluno_id"),
    supabase.from("avaliacoes_fisicas").select("aluno_id").gte("data", limiteAvaliacao),
    supabase.from("treinos").select("aluno_id").eq("professor_id", professor.id).eq("ativo", true),
    supabase.from("treino_execucoes").select("aluno_id").gte("finalizado_em", limiteTreino),
  ]);

  const aulas = ((aulasData ?? []) as unknown as (Aula & {
    aluno_horarios: { alunos: Aluno | null }[];
  })[]).map(({ aluno_horarios, ...a }) => ({
    ...a,
    turma: aluno_horarios.map((v) => v.alunos).filter((x): x is Aluno => !!x),
  }));
  const presentesPorHora = new Map<string, number>();
  for (const p of (presData ?? []) as { hora: string | null }[]) {
    const h = (p.hora ?? "").slice(0, 5);
    presentesPorHora.set(h, (presentesPorHora.get(h) ?? 0) + 1);
  }
  const presentes = (a: Aula) => presentesPorHora.get(a.hora_inicio.slice(0, 5)) ?? 0;

  const dia = dividirAulasDoDia(aulas, format(agora, "HH:mm"));
  // Aulas que já acabaram, tinham alunos e ficaram sem nenhuma presença.
  const semChamada = dia.passadas.filter((a) => a.turma.length > 0 && presentes(a) === 0);

  // Pendências da carteira (o que o professor esquece no dia a dia).
  const alunos = (alunosData ?? []) as (Aluno & { tipo: string })[];
  const comAnamnese = new Set(((anamData ?? []) as { aluno_id: string }[]).map((r) => r.aluno_id));
  const avaliadosRecente = new Set(((avalData ?? []) as { aluno_id: string }[]).map((r) => r.aluno_id));
  const comFicha = new Set(((fichasData ?? []) as { aluno_id: string }[]).map((r) => r.aluno_id));
  const treinaram = new Set(((execData ?? []) as { aluno_id: string }[]).map((r) => r.aluno_id));
  const pendencias: { aluno: Aluno; texto: string; ancora: string }[] = [];
  for (const a of alunos) {
    if (!comAnamnese.has(a.id)) pendencias.push({ aluno: a, texto: "sem anamnese", ancora: "#anamnese" });
    else if (!avaliadosRecente.has(a.id))
      pendencias.push({ aluno: a, texto: `avaliação há mais de ${DIAS_REAVALIAR} dias`, ancora: "#avaliacao" });
    if (a.tipo === "online" && !comFicha.has(a.id))
      pendencias.push({ aluno: a, texto: "online sem ficha de treino", ancora: "#treino" });
    else if (a.tipo === "online" && !treinaram.has(a.id))
      pendencias.push({ aluno: a, texto: `não treina há ${DIAS_SEM_TREINAR}+ dias`, ancora: "#treino" });
  }

  const linkChamada = (a: Aula) => `/professor/presenca?data=${hoje}&hora=${a.hora_inicio}`;

  return (
    <>
      <PageHeader titulo={titulo} subtitulo={subtitulo} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          {/* AGORA */}
          {dia.agora ? (
            <Card className="gap-4 border-0 bg-primary p-5 text-primary-foreground shadow-md">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold tracking-wider uppercase opacity-90">Agora</p>
                <p className="text-sm tabular-nums opacity-90">
                  {presentes(dia.agora)}/{dia.agora.turma.length} presentes
                </p>
              </div>
              <p className="font-heading text-3xl font-bold tabular-nums">
                {horaCurta(dia.agora.hora_inicio)} – {horaCurta(dia.agora.hora_fim)}
              </p>
              <Turma alunos={dia.agora.turma} />
              <Link
                href={linkChamada(dia.agora)}
                className={cn(buttonVariants({ size: "lg" }), "bg-white text-primary hover:bg-white/90")}
              >
                <CalendarCheck className="size-5" />
                Fazer chamada
              </Link>
            </Card>
          ) : null}

          {/* A SEGUIR */}
          {dia.aSeguir ? (
            <Link href={linkChamada(dia.aSeguir)} className="block">
              <Card className="flex-row items-center gap-4 p-4 transition-colors hover:bg-secondary/40">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    {dia.agora ? "A seguir" : "Próxima aula"}
                  </p>
                  <p className="font-heading text-xl font-bold tabular-nums">
                    {horaCurta(dia.aSeguir.hora_inicio)} – {horaCurta(dia.aSeguir.hora_fim)}
                  </p>
                  <div className="text-muted-foreground">
                    <Turma alunos={dia.aSeguir.turma} />
                  </div>
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
              </Card>
            </Link>
          ) : null}

          {!dia.agora && !dia.aSeguir ? (
            <Card className="flex-row items-center gap-3 p-5">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                <Clock className="size-5" />
              </span>
              <p className="text-muted-foreground">
                {aulas.length === 0 ? "Nenhuma aula na sua grade hoje." : "As aulas de hoje já terminaram."}
              </p>
            </Card>
          ) : null}

          {/* Chamada esquecida: um aviso só, com um atalho por aula */}
          {semChamada.length > 0 ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
              <p className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="size-5 shrink-0" />
                {semChamada.length === 1
                  ? "Uma aula de hoje ficou sem chamada"
                  : `${semChamada.length} aulas de hoje ficaram sem chamada`}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {semChamada.map((a) => (
                  <Link
                    key={a.id}
                    href={linkChamada(a)}
                    className="inline-flex h-11 items-center rounded-full bg-white px-4 text-sm font-semibold tabular-nums ring-1 ring-amber-300 hover:bg-amber-100 sm:h-9"
                  >
                    {horaCurta(a.hora_inicio)}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {/* Resto do dia, recolhido */}
          {dia.maisTarde.length + dia.passadas.length > 0 ? (
            <details className="group rounded-xl border bg-card">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-medium">
                Todas as aulas de hoje ({aulas.length})
                <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
              </summary>
              <ul className="divide-y border-t">
                {aulas.map((a) => {
                  const passou = dia.passadas.includes(a);
                  return (
                    <li key={a.id}>
                      <Link
                        href={linkChamada(a)}
                        className={cn("flex min-h-12 items-center gap-3 px-4 py-2 hover:bg-muted/50", passou && "opacity-60")}
                      >
                        <span className="w-24 shrink-0 font-medium tabular-nums">
                          {horaCurta(a.hora_inicio)}–{horaCurta(a.hora_fim)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                          {a.turma.length === 0 ? "Sem alunos" : a.turma.map((x) => x.nome.split(" ")[0]).join(", ")}
                        </span>
                        {passou && a.turma.length > 0 ? (
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {presentes(a)}/{a.turma.length}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </details>
          ) : null}
        </div>

        {/* Pendências da carteira */}
        <Card className="h-fit gap-0 p-0">
          <div className="flex items-center gap-2 px-5 pt-5 pb-3">
            <ClipboardList className="size-5 text-primary" />
            <h2 className="font-heading font-bold">Pendências</h2>
            {pendencias.length > 0 ? (
              <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                {pendencias.length}
              </span>
            ) : null}
          </div>
          {pendencias.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">Tudo em dia com seus alunos. 👏</p>
          ) : (
            <ul className="divide-y border-t">
              {pendencias.slice(0, 8).map((p) => (
                <li key={p.aluno.id + p.texto}>
                  <Link
                    href={`/professor/alunos/${p.aluno.id}${p.ancora}`}
                    className="flex min-h-12 items-center gap-3 px-5 py-2 hover:bg-muted/50"
                  >
                    <AvatarIniciais nome={p.aluno.nome} tamanho="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.aluno.nome}</span>
                      <span className="block text-xs text-muted-foreground">{p.texto}</span>
                    </span>
                    {p.texto.includes("ficha") || p.texto.includes("treina") ? (
                      <Dumbbell className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-4 text-muted-foreground" />
                    )}
                  </Link>
                </li>
              ))}
              {pendencias.length > 8 ? (
                <li className="px-5 py-3 text-sm text-muted-foreground">
                  e mais {plural(pendencias.length - 8, "pendência", "pendências")} em Meus alunos
                </li>
              ) : null}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
