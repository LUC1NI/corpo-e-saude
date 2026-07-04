import { format, startOfMonth } from "date-fns";
import {
  Activity,
  AlertTriangle,
  CalendarCheck,
  Clock,
  Dumbbell,
  Users,
} from "lucide-react";
import Link from "@/components/ui-extra/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { StatCard } from "@/components/ui-extra/stat-card";
import { requireUsuario } from "@/lib/auth";
import { hojeISO } from "@/lib/financeiro";
import { formatDataExtenso } from "@/lib/formato";
import { getProfessorAtual } from "@/lib/professor";
import { createClient } from "@/lib/supabase/server";
import { DIAS_SEMANA, horaCurta } from "@/lib/tipos";
import { cn } from "@/lib/utils";

import { GerenciarAula } from "./horarios/gerenciar-aula";

const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];
const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function ProfessorDashboard() {
  const usuario = await requireUsuario(["professor"]);
  const hojeExtenso = formatDataExtenso(new Date());
  const professor = await getProfessorAtual();

  if (!professor) {
    return (
      <>
        <PageHeader
          titulo={`Olá, ${usuario.nome.split(" ")[0]}`}
          subtitulo={hojeExtenso[0]!.toUpperCase() + hojeExtenso.slice(1)}
        />
        <PageEmpty
          icone={Users}
          titulo="Perfil de professor não encontrado"
          descricao="Fale com o administrador do studio."
        />
      </>
    );
  }

  const supabase = await createClient();
  const hoje = hojeISO();
  const inicioMes = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const diaHoje = new Date(`${hoje}T00:00:00`).getDay();
  // Hora atual (HH:mm:ss) para esmaecer aulas de hoje que já terminaram.
  const horaAgora = format(new Date(), "HH:mm:ss");

  const [
    { count: meusAlunos },
    { count: treinosAtivos, data: fichasData },
    { count: avaliacoesMes },
    { count: presencasHoje },
    { data: alunosData },
    { data: horsData },
  ] = await Promise.all([
    supabase
      .from("alunos")
      .select("id", { count: "exact", head: true })
      .eq("professor_id", professor.id)
      .eq("status", "ativo"),
    // Além do total, traz o aluno_id de cada ficha ativa para detectar
    // alunos da carteira que ainda estão sem treino.
    supabase
      .from("treinos")
      .select("aluno_id", { count: "exact" })
      .eq("professor_id", professor.id)
      .eq("ativo", true),
    supabase
      .from("avaliacoes_fisicas")
      .select("id", { count: "exact", head: true })
      .gte("data", inicioMes),
    supabase
      .from("presencas")
      .select("id", { count: "exact", head: true })
      .eq("professor_id", professor.id)
      .eq("data", hoje),
    supabase
      .from("alunos")
      .select("id, nome")
      .eq("professor_id", professor.id)
      .eq("status", "ativo")
      .order("nome"),
    supabase
      .from("horarios")
      .select("id, dia_semana, hora_inicio, hora_fim, capacidade")
      .eq("professor_id", professor.id)
      .order("hora_inicio"),
  ]);

  const alunos = (alunosData ?? []) as { id: string; nome: string }[];
  const horarios = (horsData ?? []) as {
    id: string;
    dia_semana: number;
    hora_inicio: string;
    hora_fim: string;
    capacidade: number | null;
  }[];

  // Alunos atribuídos por horário (para o badge e o diálogo de edição).
  const horIds = horarios.map((h) => h.id);
  const { data: vincData } = horIds.length
    ? await supabase
        .from("aluno_horarios")
        .select("horario_id, alunos(id, nome)")
        .in("horario_id", horIds)
    : { data: [] as unknown[] };
  const atribuidosPorHorario = new Map<string, { id: string; nome: string }[]>();
  for (const v of (vincData ?? []) as unknown as {
    horario_id: string;
    alunos: { id: string; nome: string } | null;
  }[]) {
    if (!v.alunos) continue;
    const lista = atribuidosPorHorario.get(v.horario_id) ?? [];
    lista.push(v.alunos);
    atribuidosPorHorario.set(v.horario_id, lista);
  }

  // Aulas de hoje (para a chamada em um clique) e alunos sem ficha ativa.
  const aulasHoje = horarios.filter((h) => h.dia_semana === diaHoje);
  const comFicha = new Set(
    ((fichasData ?? []) as { aluno_id: string }[]).map((f) => f.aluno_id),
  );
  const alunosSemFicha = alunos.filter((a) => !comFicha.has(a.id));

  // Matriz da semana: linhas = faixas de horário, colunas = dias.
  const faixasMap = new Map<string, { inicio: string; fim: string }>();
  const porDiaFaixa = new Map<string, (typeof horarios)[number]>();
  for (const h of horarios) {
    faixasMap.set(`${h.hora_inicio}|${h.hora_fim}`, {
      inicio: h.hora_inicio,
      fim: h.hora_fim,
    });
    porDiaFaixa.set(`${h.dia_semana}|${h.hora_inicio}|${h.hora_fim}`, h);
  }
  const faixas = [...faixasMap.values()].sort((a, b) =>
    a.inicio.localeCompare(b.inicio),
  );

  return (
    <>
      <PageHeader
        titulo={`Olá, ${usuario.nome.split(" ")[0]}`}
        subtitulo={hojeExtenso[0]!.toUpperCase() + hojeExtenso.slice(1)}
      />

      {/* Aulas de hoje — chamada em um clique */}
      <section className="mb-6">
        <h2 className="mb-3 font-heading text-lg font-bold">
          Aulas de hoje
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {DIAS_SEMANA[diaHoje]}
          </span>
        </h2>

        {aulasHoje.length === 0 ? (
          <Card className="flex-row items-center gap-3 p-4">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
              <Clock className="size-5" />
            </span>
            <p className="text-sm text-muted-foreground">
              Nenhuma aula na sua grade hoje.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {aulasHoje.map((h) => {
              const turma = atribuidosPorHorario.get(h.id) ?? [];
              // Aula encerrada: esmaece o card, mas mantém tudo clicável
              // (a chamada pode ser conferida/corrigida depois da aula).
              const encerrada = h.hora_fim <= horaAgora;
              return (
                <Card
                  key={h.id}
                  className={cn(
                    "flex-row items-center gap-3 p-4",
                    encerrada && "opacity-55",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-10 shrink-0 items-center justify-center rounded-xl",
                      encerrada
                        ? "bg-secondary text-muted-foreground"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    <Clock className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold tabular-nums">
                      {horaCurta(h.hora_inicio)}–{horaCurta(h.hora_fim)}
                      {encerrada ? (
                        <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase">
                          encerrada
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {turma.length === 0
                        ? "Sem alunos agendados"
                        : turma.map((a) => a.nome.split(" ")[0]).join(", ")}
                    </p>
                  </div>
                  <Link
                    href={`/professor/presenca?data=${hoje}&hora=${h.hora_inicio}`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "shrink-0",
                    )}
                  >
                    <CalendarCheck className="size-3.5" />
                    Chamada
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Atenção: alunos da carteira ainda sem ficha de treino. Cada nome
          leva direto à seção de treino do aluno — onde a ficha é montada. */}
      {alunosSemFicha.length > 0 ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div className="min-w-0 text-sm">
              <p className="font-medium text-amber-900">
                {alunosSemFicha.length} aluno(s) sem ficha de treino
              </p>
              <p className="text-amber-800/80">
                Toque no aluno para montar o treino dele.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {alunosSemFicha.slice(0, 6).map((a) => (
                  <Link
                    key={a.id}
                    href={`/professor/alunos/${a.id}#treino`}
                    className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-amber-900 ring-1 ring-amber-300 transition-colors hover:bg-amber-100"
                  >
                    {a.nome}
                  </Link>
                ))}
                {alunosSemFicha.length > 6 ? (
                  <Link
                    href="/professor/alunos"
                    className="rounded-full px-3 py-1.5 text-xs font-medium text-amber-800 underline-offset-2 hover:underline"
                  >
                    +{alunosSemFicha.length - 6} outros
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Grade da semana — clique numa aula para ver/editar os alunos */}
      <section className="mb-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-bold">
              Minha grade da semana
            </h2>
            <p className="text-sm text-muted-foreground">
              Toque numa aula para ver e editar os alunos dela.
            </p>
          </div>
        </div>

        {faixas.length === 0 ? (
          <Card>
            <PageEmpty
              icone={Clock}
              titulo="Sem horários cadastrados"
              descricao="Monte sua grade na aba Horários para vê-la aqui."
            />
          </Card>
        ) : (
          <>
            {/* Mobile: lista vertical por dia (a tabela de 7 colunas não cabe
                na tela do celular — e a maioria dos acessos é mobile). */}
            <div className="space-y-2.5 sm:hidden">
              {ORDEM_DIAS.map((d) => {
                const doDia = horarios.filter((h) => h.dia_semana === d);
                if (doDia.length === 0) return null;
                const ehHoje = d === diaHoje;
                return (
                  <Card
                    key={d}
                    className={cn(
                      "gap-2.5 p-4",
                      ehHoje && "border-primary/40 bg-primary/[0.03]",
                    )}
                  >
                    <p className="text-sm font-semibold">
                      {DIAS_SEMANA[d]}
                      {ehHoje ? (
                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                          hoje
                        </span>
                      ) : null}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {doDia.map((h) => {
                        const turma = atribuidosPorHorario.get(h.id) ?? [];
                        const encerrada = ehHoje && h.hora_fim <= horaAgora;
                        return (
                          <div
                            key={h.id}
                            className={cn(
                              "flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5",
                              encerrada && "opacity-55",
                            )}
                          >
                            <span className="text-xs font-medium tabular-nums">
                              {horaCurta(h.hora_inicio)}
                            </span>
                            <GerenciarAula
                              horarioId={h.id}
                              rotulo={`${DIAS_CURTOS[d]} ${horaCurta(h.hora_inicio)}–${horaCurta(h.hora_fim)}`}
                              alunos={alunos}
                              atribuidos={turma.map((a) => a.id)}
                              capacidade={h.capacidade}
                              permitirRemover={false}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Desktop: matriz semanal completa. */}
            <Card className="hidden overflow-hidden p-0 sm:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="sticky left-0 z-10 bg-card pl-5">
                    Horário
                  </TableHead>
                  {ORDEM_DIAS.map((d) => (
                    <TableHead
                      key={d}
                      className={cn(
                        "min-w-16 text-center",
                        d === diaHoje && "text-primary",
                      )}
                    >
                      {DIAS_CURTOS[d]}
                      {d === diaHoje ? (
                        <span className="ml-1 text-[10px] opacity-70">
                          hoje
                        </span>
                      ) : null}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {faixas.map((f) => (
                  <TableRow key={`${f.inicio}|${f.fim}`}>
                    <TableCell className="sticky left-0 z-10 bg-card pl-5 font-medium whitespace-nowrap tabular-nums">
                      {horaCurta(f.inicio)}–{horaCurta(f.fim)}
                    </TableCell>
                    {ORDEM_DIAS.map((d) => {
                      const h = porDiaFaixa.get(`${d}|${f.inicio}|${f.fim}`);
                      if (!h) {
                        return (
                          <TableCell
                            key={d}
                            className={cn(
                              "text-center text-muted-foreground/40",
                              d === diaHoje && "bg-primary/5",
                            )}
                          >
                            —
                          </TableCell>
                        );
                      }
                      const atribuidos = atribuidosPorHorario.get(h.id) ?? [];
                      return (
                        <TableCell
                          key={d}
                          className={cn(
                            "text-center",
                            d === diaHoje && "bg-primary/5",
                            d === diaHoje &&
                              h.hora_fim <= horaAgora &&
                              "opacity-55",
                          )}
                        >
                          <GerenciarAula
                            horarioId={h.id}
                            rotulo={`${DIAS_CURTOS[d]} ${horaCurta(f.inicio)}–${horaCurta(f.fim)}`}
                            alunos={alunos}
                            atribuidos={atribuidos.map((a) => a.id)}
                            capacidade={h.capacidade}
                            permitirRemover={false}
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </Card>
          </>
        )}
      </section>

      {/* Indicadores */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          titulo="Meus alunos"
          valor={String(meusAlunos ?? 0)}
          icone={Users}
          tomIcone="primary"
          rodape="Sua carteira"
          href="/professor/alunos"
        />
        <StatCard
          titulo="Treinos ativos"
          valor={String(treinosAtivos ?? 0)}
          icone={Dumbbell}
          rodape="Fichas em vigência"
          href="/professor/treinos"
        />
        <StatCard
          titulo="Avaliações no mês"
          valor={String(avaliacoesMes ?? 0)}
          icone={Activity}
          tomIcone="sucesso"
          rodape="Registradas este mês"
        />
        <StatCard
          titulo="Presenças hoje"
          valor={String(presencasHoje ?? 0)}
          icone={CalendarCheck}
          rodape={DIAS_SEMANA[diaHoje]}
          href="/professor/presenca"
        />
      </div>
    </>
  );
}
