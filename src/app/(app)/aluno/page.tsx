import { format, startOfMonth } from "date-fns";
import {
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

import { SituacaoMensalidadeCard } from "@/components/aluno/situacao-mensalidade";
import { AtivarNotificacoes } from "@/components/pwa/ativar-notificacoes";
import { Card } from "@/components/ui/card";
import { AvatarIniciais } from "@/components/ui-extra/avatar-iniciais";
import { requireUsuario } from "@/lib/auth";
import { getAlunoAtual } from "@/lib/aluno";
import {
  agoraNoEstudio,
  hojeISO,
  situacaoMensalidade,
} from "@/lib/financeiro";
import { createClient } from "@/lib/supabase/server";
import { getTreinosDoAluno } from "@/lib/treino";
import { diaDaSemanaHoje } from "@/lib/treino-utils";
import {
  DIAS_SEMANA,
  horaCurta,
  type DivisaoComExercicios,
  type TreinoComTudo,
} from "@/lib/tipos";
import { plural } from "@/lib/formato";

interface ProximoTreino {
  /** "Hoje, Segunda" / "Amanhã, Terça" / "Quarta". */
  quando: string;
  hora_inicio: string;
  hora_fim: string;
  professorNome: string;
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

/**
 * Início do aluno. Presencial: próximo treino (horário fixo) + mensalidade.
 * Online: treino do dia (ficha) + mensalidade.
 */
export default async function AlunoHome() {
  const usuario = await requireUsuario(["aluno"]);
  const primeiro = usuario.nome.split(" ")[0];
  const diaHoje = diaDaSemanaHoje();
  const agora = agoraNoEstudio();
  const hoje = hojeISO();

  const aluno = await getAlunoAtual();
  const online = aluno?.tipo === "online";
  let treinos: TreinoComTudo[] = [];
  let abertos: { vencimento: string; valor: number }[] = [];
  let temAvaliacoes = false;
  let treinosMes = 0;
  let proximo: ProximoTreino | null = null;
  let treinoConcluidoHoje = false;

  if (aluno) {
    const supabase = await createClient();
    const inicioMes = format(startOfMonth(agora), "yyyy-MM-dd");
    const vazio = Promise.resolve({ data: [] as unknown[], count: 0 });
    const [
      treinosData,
      { data: abertosData },
      { count: avals },
      { count: pres },
      { count: execs },
      { count: execHoje },
      { data: agendaData },
    ] = await Promise.all([
      // Ficha de treino é do aluno ONLINE; o presencial treina na aula.
      online ? getTreinosDoAluno(aluno.id) : Promise.resolve([]),
      supabase
        .from("pagamentos")
        .select("vencimento, valor")
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
      online
        ? supabase
            .from("treino_execucoes")
            .select("id", { count: "exact", head: true })
            .eq("aluno_id", aluno.id)
            .gte("finalizado_em", `${inicioMes}T00:00:00-03:00`)
        : vazio,
      online
        ? supabase
            .from("treino_execucoes")
            .select("id", { count: "exact", head: true })
            .eq("aluno_id", aluno.id)
            .gte("finalizado_em", `${hoje}T00:00:00-03:00`)
        : vazio,
      // Aluno online não tem aula no estúdio: não busca (nem mostra) agenda.
      online
        ? vazio
        : supabase
            .from("aluno_horarios")
            .select(
              "horarios(dia_semana, hora_inicio, hora_fim, professores(nome))",
            )
            .eq("aluno_id", aluno.id),
    ]);
    treinos = treinosData;
    abertos = (abertosData ?? []) as typeof abertos;
    temAvaliacoes = (avals ?? 0) > 0;
    // Presenças marcadas pelo professor + treinos concluídos no app.
    treinosMes = (pres ?? 0) + (execs ?? 0);
    treinoConcluidoHoje = (execHoje ?? 0) > 0;

    // Próximo treino: a próxima ocorrência entre os horários fixos do aluno.
    // À noite, o de hoje já passou e cai para o próximo dia com aula.
    const inicioHoje = new Date(agora).setHours(0, 0, 0, 0);
    const [primeiroEvento] = (
      (agendaData ?? []) as unknown as {
        horarios: {
          dia_semana: number;
          hora_inicio: string;
          hora_fim: string;
          professores: { nome: string } | null;
        } | null;
      }[]
    )
      .map((r) => r.horarios)
      .filter((h): h is NonNullable<typeof h> => !!h)
      .map((h) => ({
        h,
        data: proximaOcorrencia(agora, h.dia_semana, h.hora_inicio),
      }))
      .sort((a, b) => a.data.getTime() - b.data.getTime());
    if (primeiroEvento) {
      const { h, data } = primeiroEvento;
      const difDias = Math.round(
        (new Date(data).setHours(0, 0, 0, 0) - inicioHoje) / 86_400_000,
      );
      const dia = DIAS_SEMANA[data.getDay()]!;
      proximo = {
        quando:
          difDias === 0 ? `Hoje, ${dia}` : difDias === 1 ? `Amanhã, ${dia}` : dia,
        hora_inicio: h.hora_inicio,
        hora_fim: h.hora_fim,
        professorNome: h.professores?.nome ?? "Seu professor",
      };
    }
  }

  const principal = treinos.find((t) => t.ativo) ?? null;
  const divisaoHoje =
    principal?.divisoes.find((d) => d.dias_semana.includes(diaHoje)) ?? null;
  const situacao = situacaoMensalidade(abertos, hoje);

  return (
    <div className="space-y-5">
      <section className="flex items-center justify-between rounded-2xl bg-[#033373] p-5 text-white shadow-sm lg:p-7">
        <div>
          <p className="text-sm text-white/70">Olá,</p>
          <p className="text-xl font-bold lg:text-2xl">{primeiro} 👋</p>
        </div>
        <AvatarIniciais
          nome={usuario.nome}
          tamanho="lg"
          className="ring-2 ring-white/20"
        />
      </section>

      {online ? (
        <TreinoDeHoje
          divisaoHoje={divisaoHoje}
          temFicha={!!principal}
          concluido={treinoConcluidoHoje}
          diaHoje={diaHoje}
        />
      ) : (
        <ProximoTreinoCard proximo={proximo} />
      )}

      <SituacaoMensalidadeCard situacao={situacao} />

      <AtivarNotificacoes modo="convite" />

      {/* Frequência do mês */}
      <Card className="flex-row items-center gap-3 p-5">
        <span
          className={
            treinosMes > 0
              ? "inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"
              : "inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground"
          }
        >
          <CalendarCheck className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {treinosMes > 0
              ? `${treinosMes} treino${treinosMes > 1 ? "s" : ""} este mês`
              : "Nenhum treino este mês"}
          </p>
          <p className="text-xs text-muted-foreground">
            {treinosMes > 0
              ? "Continue nesse ritmo! 💪"
              : online
                ? "Conclua treinos no app para contar aqui."
                : "Sua presença é registrada pelo professor nas aulas."}
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

const DESTAQUE =
  "relative block overflow-hidden rounded-2xl bg-gradient-to-br from-[#0090D8] to-[#00A8E4] p-5 text-white shadow-[0_10px_30px_rgba(0,144,216,0.35)] transition-transform hover:-translate-y-0.5";

/** Presencial: destaque do próximo treino (dia, hora e professor). */
function ProximoTreinoCard({ proximo }: { proximo: ProximoTreino | null }) {
  if (!proximo) {
    return (
      <Card className="flex-row items-center gap-3 p-5">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
          <Clock className="size-5" />
        </span>
        <div>
          <p className="font-semibold">Nenhum horário fixo ainda</p>
          <p className="text-xs text-muted-foreground">
            Quando o estúdio agendar seus horários, o próximo treino aparece
            aqui.
          </p>
        </div>
      </Card>
    );
  }
  return (
    <Link href="/aluno/horarios" className={DESTAQUE}>
      {/* brilho decorativo no canto */}
      <span className="pointer-events-none absolute -top-8 -right-8 size-28 rounded-full bg-white/10 blur-xl" />
      <div className="relative flex items-center gap-4">
        <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
          <Clock className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-white/75 uppercase">
            Próximo treino · {proximo.quando}
          </p>
          <p className="text-2xl leading-tight font-extrabold tabular-nums">
            {horaCurta(proximo.hora_inicio)} às {horaCurta(proximo.hora_fim)}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-white/85">
            <UserRound className="size-3.5" />
            {proximo.professorNome}
          </p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-white/70" />
      </div>
    </Link>
  );
}

/** Online: destaque do treino do dia (ou descanso / ficha em preparo). */
function TreinoDeHoje({
  divisaoHoje,
  temFicha,
  concluido,
  diaHoje,
}: {
  divisaoHoje: DivisaoComExercicios | null;
  temFicha: boolean;
  concluido: boolean;
  diaHoje: number;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-heading text-base font-bold">Treino de hoje</h2>
        {concluido ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="size-3.5" />
            Concluído hoje
          </span>
        ) : null}
      </div>

      {divisaoHoje ? (
        <Link href="/aluno/treino" className={DESTAQUE}>
          <span className="pointer-events-none absolute -top-8 -right-8 size-28 rounded-full bg-white/10 blur-xl" />
          <div className="relative flex items-center gap-4">
            <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-extrabold backdrop-blur">
              {divisaoHoje.nome}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold tracking-wide text-white/75 uppercase">
                {DIAS_SEMANA[diaHoje]}
              </p>
              <p className="truncate text-xl leading-tight font-extrabold">
                {divisaoHoje.foco || `Treino ${divisaoHoje.nome}`}
              </p>
              <p className="mt-0.5 text-sm text-white/85">
                {plural(divisaoHoje.exercicios.length, "exercício", "exercícios")} ·{" "}
                {concluido ? "feito hoje" : "toque para começar"}
              </p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-white/70" />
          </div>
          {divisaoHoje.exercicios.length ? (
            <ul className="relative mt-4 flex flex-wrap gap-1.5">
              {divisaoHoje.exercicios.slice(0, 5).map((ex) => (
                <li
                  key={ex.id}
                  className="rounded-md bg-white/15 px-2 py-0.5 text-xs"
                >
                  {ex.exercicio?.nome ?? "Exercício"}
                </li>
              ))}
              {divisaoHoje.exercicios.length > 5 ? (
                <li className="rounded-md bg-white/15 px-2 py-0.5 text-xs">
                  +{divisaoHoje.exercicios.length - 5}
                </li>
              ) : null}
            </ul>
          ) : null}
        </Link>
      ) : temFicha ? (
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
      ) : (
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
      )}
    </section>
  );
}
