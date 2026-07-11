import { format, startOfMonth } from "date-fns";
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Dumbbell,
  LineChart,
  Moon,
  UserRound,
} from "lucide-react";
import Link from "@/components/ui-extra/link";

import { Card } from "@/components/ui/card";
import { AvatarIniciais } from "@/components/ui-extra/avatar-iniciais";
import { requireUsuario } from "@/lib/auth";
import { getAlunoAtual } from "@/lib/aluno";
import { hojeISO } from "@/lib/financeiro";
import { createClient } from "@/lib/supabase/server";
import { getTreinosDoAluno } from "@/lib/treino";
import { diaDaSemanaHoje } from "@/lib/treino-utils";
import { DIAS_SEMANA, horaCurta, type TreinoComTudo } from "@/lib/tipos";

interface ProximoTreino {
  rotulo: string;
  hora_inicio: string;
  hora_fim: string;
  professorNome: string;
  ehHoje: boolean;
}

/**
 * Próxima ocorrência de um horário semanal a partir de agora. Se o horário de
 * hoje já passou, cai para a semana seguinte.
 */
function proximaOcorrencia(
  agora: Date,
  diaSemana: number,
  horaInicio: string,
): Date {
  const [h, m] = horaInicio.split(":").map(Number);
  const cand = new Date(agora);
  const dias = (diaSemana - agora.getDay() + 7) % 7;
  cand.setDate(agora.getDate() + dias);
  cand.setHours(h ?? 0, m ?? 0, 0, 0);
  if (cand.getTime() < agora.getTime()) cand.setDate(cand.getDate() + 7);
  return cand;
}

export default async function AlunoHome() {
  const usuario = await requireUsuario(["aluno"]);
  const primeiro = usuario.nome.split(" ")[0];
  const diaHoje = diaDaSemanaHoje();

  const aluno = await getAlunoAtual();
  const online = aluno?.tipo === "online";
  let treinos: TreinoComTudo[] = [];
  let pendencias = 0;
  let temAvaliacoes = false;
  let presencasMes = 0;
  let aulasHojeDestaque: ProximoTreino[] = [];
  let proximos: ProximoTreino[] = [];
  let treinoConcluidoHoje = false;

  if (aluno) {
    const supabase = await createClient();
    const inicioMes = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const hoje = hojeISO();
    const [
      treinosData,
      { count: pend },
      { count: avals },
      { count: pres },
      { count: execs },
      { count: execHoje },
      { data: agendaData },
    ] = await Promise.all([
      getTreinosDoAluno(aluno.id),
      supabase
        .from("pagamentos")
        .select("id", { count: "exact", head: true })
        .eq("aluno_id", aluno.id)
        .neq("status", "pago"),
      supabase
        .from("avaliacoes_fisicas")
        .select("id", { count: "exact", head: true })
        .eq("aluno_id", aluno.id),
      supabase
        .from("presencas")
        .select("id", { count: "exact", head: true })
        .eq("aluno_id", aluno.id)
        .gte("data", inicioMes),
      supabase
        .from("treino_execucoes")
        .select("id", { count: "exact", head: true })
        .eq("aluno_id", aluno.id)
        .gte("finalizado_em", inicioMes),
      supabase
        .from("treino_execucoes")
        .select("id", { count: "exact", head: true })
        .eq("aluno_id", aluno.id)
        .gte("finalizado_em", `${hoje}T00:00:00`),
      supabase
        .from("aluno_horarios")
        .select(
          "horarios(dia_semana, hora_inicio, hora_fim, professores(nome))",
        )
        .eq("aluno_id", aluno.id),
    ]);
    treinos = treinosData;
    pendencias = pend ?? 0;
    temAvaliacoes = (avals ?? 0) > 0;
    // Presenças marcadas pelo professor + treinos concluídos no app.
    presencasMes = (pres ?? 0) + (execs ?? 0);
    // Só o aluno online conclui treinos pelo app (registra execução).
    treinoConcluidoHoje = online && (execHoje ?? 0) > 0;

    // Próximos treinos: a próxima ocorrência de cada horário agendado, a
    // partir de agora. À noite, o horário de hoje já passou → aparece o de
    // amanhã (ou o próximo dia com aula).
    const agora = new Date();
    const inicioHoje = new Date(agora).setHours(0, 0, 0, 0);
    const eventos = ((agendaData ?? []) as unknown as {
      horarios: {
        dia_semana: number;
        hora_inicio: string;
        hora_fim: string;
        professores: { nome: string } | null;
      } | null;
    }[])
      .map((r) => r.horarios)
      .filter((h): h is NonNullable<typeof h> => !!h)
      .map((h) => {
        const quando = proximaOcorrencia(agora, h.dia_semana, h.hora_inicio);
        const difDias = Math.round(
          (new Date(quando).setHours(0, 0, 0, 0) - inicioHoje) / 86_400_000,
        );
        const rotulo =
          difDias === 0
            ? "Hoje"
            : difDias === 1
              ? "Amanhã"
              : DIAS_SEMANA[quando.getDay()]!;
        const evento: ProximoTreino = {
          rotulo,
          hora_inicio: h.hora_inicio,
          hora_fim: h.hora_fim,
          professorNome: h.professores?.nome ?? "Seu professor",
          ehHoje: difDias === 0,
        };
        return { evento, ordem: quando.getTime() };
      })
      .sort((a, b) => a.ordem - b.ordem);
    // Tem aula hoje (ainda por vir) → card de destaque. Senão, a lista dos
    // próximos dias.
    aulasHojeDestaque = eventos
      .filter((e) => e.evento.ehHoje)
      .map((e) => e.evento);
    proximos = eventos
      .filter((e) => !e.evento.ehHoje)
      .slice(0, 4)
      .map((e) => e.evento);
  }

  const ativos = treinos.filter((t) => t.ativo);
  const principal = ativos[0] ?? null;
  const divisaoHoje =
    principal?.divisoes.find((d) => d.dias_semana.includes(diaHoje)) ?? null;
  const emDia = pendencias === 0;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-[#033373] p-5 text-white shadow-sm lg:p-7">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/70">Olá,</p>
            <p className="text-xl font-bold lg:text-2xl">{primeiro} 👋</p>
          </div>
          <AvatarIniciais
            nome={usuario.nome}
            tamanho="lg"
            className="ring-2 ring-white/20"
          />
        </div>

        <Link
          href="/aluno/mensalidade"
          className="mt-4 flex items-center gap-3 rounded-xl bg-white/10 p-3 transition-colors hover:bg-white/15 lg:max-w-sm"
        >
          <span
            className={
              emDia
                ? "inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/90 text-white"
                : "inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white"
            }
          >
            {emDia ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <AlertCircle className="size-4" />
            )}
          </span>
          <div className="flex-1 text-sm leading-tight">
            <p className="font-medium">Situação financeira</p>
            <p className="text-xs text-white/60">
              {emDia ? "Tudo em dia" : `${pendencias} mensalidade(s) em aberto`}
            </p>
          </div>
          <ChevronRight className="size-4 text-white/50" />
        </Link>
      </section>

      {/* Aula(s) de hoje: card em destaque, logo abaixo do card principal. */}
      {aulasHojeDestaque.length > 0 ? (
        <section>
          <h2 className="mb-2 font-heading text-base font-bold">
            {aulasHojeDestaque.length > 1
              ? "Suas aulas de hoje"
              : "Sua aula de hoje"}
          </h2>
          <div className="space-y-2.5">
            {aulasHojeDestaque.map((a, i) => (
              <div
                key={`hoje-${a.hora_inicio}-${i}`}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0090D8] to-[#00A8E4] p-5 text-white shadow-[0_10px_30px_rgba(0,144,216,0.35)]"
              >
                {/* brilho decorativo no canto */}
                <span className="pointer-events-none absolute -top-8 -right-8 size-28 rounded-full bg-white/10 blur-xl" />
                <div className="relative flex items-center gap-4">
                  <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                    <Clock className="size-7" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold tracking-wide text-white/70 uppercase">
                      Hoje · {DIAS_SEMANA[diaHoje]}
                    </p>
                    <p className="text-2xl leading-tight font-extrabold tabular-nums">
                      {horaCurta(a.hora_inicio)}–{horaCurta(a.hora_fim)}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-white/85">
                      <UserRound className="size-3.5" />
                      {a.professorNome}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : proximos.length > 0 ? (
        <section>
          <h2 className="mb-2 font-heading text-base font-bold">
            Próximos treinos
          </h2>
          <div className="space-y-2">
            {proximos.map((a, i) => (
              <Card
                key={`${a.rotulo}-${a.hora_inicio}-${i}`}
                className="flex-row items-center gap-3 p-4"
              >
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Clock className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {a.rotulo}
                    <span className="ml-2 font-normal tabular-nums text-muted-foreground">
                      {horaCurta(a.hora_inicio)}–{horaCurta(a.hora_fim)}
                    </span>
                  </p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <UserRound className="size-3" />
                    {a.professorNome}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {/* Treino de hoje */}
      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="font-heading text-base font-bold">Treino de hoje</h2>
          {treinoConcluidoHoje ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="size-3.5" />
              Concluído hoje
            </span>
          ) : null}
        </div>

        {divisaoHoje ? (
          <Link href="/aluno/treino">
            <Card className="gap-3 p-5 transition-colors hover:border-primary/40 hover:bg-secondary/30">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
                  {divisaoHoje.nome}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {divisaoHoje.foco || `Treino ${divisaoHoje.nome}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {divisaoHoje.exercicios.length} exercício(s) ·{" "}
                    {DIAS_SEMANA[diaHoje]}
                  </p>
                </div>
                <ChevronRight className="size-5 text-muted-foreground" />
              </div>

              {divisaoHoje.exercicios.length ? (
                <ul className="flex flex-wrap gap-1.5">
                  {divisaoHoje.exercicios.slice(0, 5).map((ex) => (
                    <li
                      key={ex.id}
                      className="rounded-md bg-secondary px-2 py-0.5 text-xs"
                    >
                      {ex.exercicio?.nome ?? "Exercício"}
                    </li>
                  ))}
                  {divisaoHoje.exercicios.length > 5 ? (
                    <li className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                      +{divisaoHoje.exercicios.length - 5}
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </Card>
          </Link>
        ) : principal ? (
          <Link href="/aluno/treino">
            <Card className="flex-row items-center gap-3 p-5 transition-colors hover:border-primary/40 hover:bg-secondary/30">
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                <Moon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Dia de descanso</p>
                <p className="text-xs text-muted-foreground">
                  Nada agendado para hoje. Toque para ver sua ficha completa.
                </p>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" />
            </Card>
          </Link>
        ) : online ? (
          <Card className="flex-row items-center gap-3 p-5">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
              <Dumbbell className="size-5" />
            </span>
            <div>
              <p className="font-semibold">Treino em breve</p>
              <p className="text-xs text-muted-foreground">
                Seu treino aparece aqui quando o professor montar a ficha.
              </p>
            </div>
          </Card>
        ) : (
          // Presencial sem ficha no app: o treino é conduzido na aula.
          <Link href="/aluno/treino">
            <Card className="flex-row items-center gap-3 p-5 transition-colors hover:border-primary/40 hover:bg-secondary/30">
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Dumbbell className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Treino no estúdio</p>
                <p className="text-xs text-muted-foreground">
                  Seu professor conduz o treino na sua aula. Veja seus próximos
                  horários acima.
                </p>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" />
            </Card>
          </Link>
        )}
      </section>

      {/* Frequência do mês */}
      <Card className="flex-row items-center gap-3 p-5">
        <span
          className={
            presencasMes > 0
              ? "inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"
              : "inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground"
          }
        >
          <CalendarCheck className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {presencasMes > 0
              ? `${presencasMes} treino${presencasMes > 1 ? "s" : ""} este mês`
              : "Nenhum treino este mês"}
          </p>
          <p className="text-xs text-muted-foreground">
            {presencasMes > 0
              ? "Continue nesse ritmo! 💪"
              : "Conclua treinos no app ou marque presença no estúdio."}
          </p>
        </div>
      </Card>

      {/* Evolução */}
      <Link href="/aluno/evolucao">
        <Card className="flex-row items-center gap-3 p-5 transition-colors hover:border-primary/40 hover:bg-secondary/30">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LineChart className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Sua evolução</p>
            <p className="text-xs text-muted-foreground">
              {temAvaliacoes
                ? "Acompanhe peso, % de gordura e medidas."
                : "Seus gráficos chegam com a avaliação física."}
            </p>
          </div>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Card>
      </Link>
    </div>
  );
}
