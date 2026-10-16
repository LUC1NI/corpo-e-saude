import { format, startOfMonth } from "date-fns";
import {
  CalendarCheck,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Dumbbell,
  LineChart,
  Moon,
  UserRound,
} from "lucide-react";
import Link from "@/components/ui-extra/link";

import { PagamentoPix } from "@/app/(app)/aluno/mensalidade/pagamento-pix";
import { textosMensalidade } from "@/components/aluno/situacao-mensalidade";
import { AtivarNotificacoes } from "@/components/pwa/ativar-notificacoes";
import { Card } from "@/components/ui/card";
import { requireUsuario } from "@/lib/auth";
import { getAlunoAtual } from "@/lib/aluno";
import {
  agoraNoEstudio,
  hojeISO,
  precisaPagar,
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
import { formatMesAno, plural } from "@/lib/formato";
import { cn } from "@/lib/utils";

interface ProximoTreino {
  /** "Hoje, Segunda" / "Amanhã, Terça" / "Quarta". */
  quando: string;
  /** A aula está acontecendo agora. */
  agora: boolean;
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
  horaFim: string,
): Date {
  const [h, m] = horaInicio.split(":").map(Number);
  const [hf, mf] = horaFim.split(":").map(Number);
  const cand = new Date(agora);
  const dias = (diaSemana - agora.getDay() + 7) % 7;
  cand.setDate(agora.getDate() + dias);
  cand.setHours(h ?? 0, m ?? 0, 0, 0);
  const fim = new Date(cand);
  fim.setHours(hf ?? 0, mf ?? 0, 0, 0);
  // Só pula para a semana seguinte depois que a aula TERMINOU (em andamento conta).
  if (fim.getTime() <= agora.getTime()) cand.setDate(cand.getDate() + 7);
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
  let proxima: { data: string; valor: number } | null = null;
  let temAvaliacoes = false;
  let treinosMes = 0;
  let proximo: ProximoTreino | null = null;
  let treinoConcluidoHoje = false;
  let peso: { atual: number; variacao: number | null; desde: string } | null = null;

  if (aluno) {
    const supabase = await createClient();
    const inicioMes = format(startOfMonth(agora), "yyyy-MM-dd");
    const vazio = Promise.resolve({ data: [] as unknown[], count: 0 });
    const [
      treinosData,
      { data: abertosData },
      { count: avals, data: pesosData },
      { count: pres },
      { count: execs },
      { count: execHoje },
      { data: agendaData },
      { data: matriculaData },
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
        .select("data, peso", { count: "exact" })
        .eq("aluno_id", aluno.id)
        .not("peso", "is", null)
        .order("data", { ascending: true }),
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
      supabase
        .from("matriculas")
        .select("data_proxima_cobranca, planos(valor)")
        .eq("aluno_id", aluno.id)
        .eq("status", "ativa")
        .maybeSingle(),
    ]);
    treinos = treinosData;
    const m = matriculaData as unknown as { data_proxima_cobranca: string; planos: { valor: number } | null } | null;
    proxima = m?.planos ? { data: m.data_proxima_cobranca, valor: m.planos.valor } : null;
    abertos = (abertosData ?? []) as typeof abertos;
    temAvaliacoes = (avals ?? 0) > 0;
    const pesos = (pesosData ?? []) as { data: string; peso: number }[];
    if (pesos.length > 0) {
      const ult = pesos[pesos.length - 1]!;
      peso = {
        atual: Number(ult.peso),
        variacao: pesos.length > 1 ? Number(ult.peso) - Number(pesos[0]!.peso) : null,
        desde: pesos[0]!.data,
      };
    }
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
        data: proximaOcorrencia(agora, h.dia_semana, h.hora_inicio, h.hora_fim),
      }))
      .sort((a, b) => a.data.getTime() - b.data.getTime());
    if (primeiroEvento) {
      const { h, data } = primeiroEvento;
      const difDias = Math.round(
        (new Date(data).setHours(0, 0, 0, 0) - inicioHoje) / 86_400_000,
      );
      const dia = DIAS_SEMANA[data.getDay()]!;
      proximo = {
        agora: data.getTime() <= agora.getTime(),
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
  const situacaoTextos = textosMensalidade(situacao, proxima);
  const situacaoTom = situacaoTextos.tom;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-brand-navy p-5 text-white shadow-sm lg:p-7">
        <h1 className="text-2xl font-bold lg:text-3xl">Olá, {primeiro} 👋</h1>
        <Link
          href="/aluno/mensalidade"
          className={cn(
            "mt-4 flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 transition-colors",
            // Fundo sempre discreto: só o ícone leva a cor do status (lembrete, não alarme).
            "bg-white/10 hover:bg-white/15",
          )}
        >
          <span
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
              situacaoTom === "ok" ? "bg-emerald-500" : situacaoTom === "aviso" ? "bg-amber-400 text-amber-950" : "bg-red-500",
            )}
          >
            {situacaoTom === "ok" ? <CheckCircle2 className="size-5" /> : <AlertCircle className="size-5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{situacaoTom === "ok" ? "Mensalidade em dia" : situacaoTextos.titulo}</span>
            <span className="line-clamp-2 block text-sm opacity-85">{situacaoTextos.detalhe}</span>
          </span>
          <ChevronRight className="size-5 shrink-0 opacity-70" />
        </Link>
        {situacao.tipo !== "em_dia" && precisaPagar(situacao) ? (
          <div className="mt-3">
            <PagamentoPix valor={situacao.total} descricao={situacaoTextos.detalhe} variante="destaque" />
          </div>
        ) : null}
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


      <AtivarNotificacoes modo="convite" />

      {/* Frequência e evolução: dois chips lado a lado. */}
      <div className="grid grid-cols-2 gap-3">
        <Link href={online ? "/aluno/treino" : "/aluno/horarios"} className="group">
          <Card className="h-full gap-1 p-4 transition-colors group-hover:border-primary/40 group-hover:bg-secondary/30">
            <span
              className={cn(
                "mb-1 inline-flex size-9 items-center justify-center rounded-xl",
                treinosMes > 0 ? "bg-emerald-50 text-emerald-600" : "bg-secondary text-muted-foreground",
              )}
            >
              <CalendarCheck className="size-5" />
            </span>
            <p className="font-heading text-2xl font-bold tabular-nums">{treinosMes}</p>
            <p className="text-sm text-muted-foreground">
              {online ? (treinosMes === 1 ? "treino" : "treinos") : treinosMes === 1 ? "aula" : "aulas"} este mês
              {treinosMes >= 8 ? " 🔥" : ""}
            </p>
          </Card>
        </Link>

        <Link href="/aluno/evolucao" className="group">
          <Card className="h-full gap-1 p-4 transition-colors group-hover:border-primary/40 group-hover:bg-secondary/30">
            <span className="mb-1 inline-flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <LineChart className="size-5" />
            </span>
            {peso ? (
              <>
                <p className="font-heading text-2xl font-bold tabular-nums">
                  {peso.atual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg
                </p>
                <p className="text-sm text-muted-foreground">
                  {peso.variacao !== null && Math.abs(peso.variacao) >= 0.1
                    ? `${peso.variacao > 0 ? "+" : "−"}${Math.abs(peso.variacao).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg desde ${formatMesAno(peso.desde).split("/")[0]!.toLowerCase()}`
                    : "Sua evolução"}
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold">Sua evolução</p>
                <p className="text-sm text-muted-foreground">
                  {temAvaliacoes ? "Peso e medidas" : "Chega com a avaliação física"}
                </p>
              </>
            )}
          </Card>
        </Link>
      </div>
    </div>
  );
}

const DESTAQUE =
  "relative block overflow-hidden rounded-2xl bg-gradient-to-br from-cta-de to-cta-ate p-5 text-white shadow-[0_10px_30px_rgba(0,144,216,0.35)] transition-transform hover:-translate-y-0.5";

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
          <p className="text-xs font-semibold tracking-wide text-white/80 uppercase">
            {proximo.agora ? "Agora · aula em andamento" : `Próxima aula · ${proximo.quando}`}
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
                {plural(divisaoHoje.exercicios.length, "exercício", "exercícios")}
                {concluido ? " · feito hoje ✓" : ""}
              </p>
            </div>
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
          <span className="relative mt-4 flex h-12 items-center justify-center rounded-xl bg-white font-semibold text-primary">
            {concluido ? "Ver treino de hoje" : `Começar treino ${divisaoHoje.nome}`}
          </span>
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
