import { CalendarCheck, ChevronLeft, ChevronRight, Clock, UserRound } from "lucide-react";
import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FrequenciaCard } from "@/components/ui-extra/frequencia";
import Link from "@/components/ui-extra/link";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { getAlunoAtual } from "@/lib/aluno";
import { requireUsuario } from "@/lib/auth";
import { hojeISO } from "@/lib/financeiro";
import { formatData } from "@/lib/formato";
import { getFrequenciaDoAluno } from "@/lib/frequencia";
import {
  historicoAulas,
  janelaPagina,
  type AulaHistorico,
} from "@/lib/historico-aulas";
import { createClient } from "@/lib/supabase/server";
import { DIAS_SEMANA, horaCurta } from "@/lib/tipos";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Meus horários" };

interface Vinculo {
  criado_em: string;
  horarios: {
    dia_semana: number;
    hora_inicio: string;
    hora_fim: string;
    professores: { nome: string } | null;
  } | null;
}

/** Máximo de páginas (4 semanas cada) para trás: ~1 ano de histórico. */
const MAX_PAGINAS = 13;

const SELO: Record<AulaHistorico["status"], { rotulo: string; classe: string }> = {
  presente: { rotulo: "Presente", classe: "bg-emerald-50 text-emerald-700" },
  falta: { rotulo: "Falta", classe: "bg-red-50 text-red-700" },
  extra: { rotulo: "Aula extra", classe: "bg-primary/10 text-primary" },
};

/** Data (yyyy-MM-dd) de um timestamp no fuso do estúdio. */
function dataNoEstudio(ts: string): string {
  return new Date(ts).toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
}

/**
 * Horários do aluno PRESENCIAL: só os horários fixos dele na semana (não a
 * grade do estúdio) + histórico de presenças e faltas, paginado. RLS garante
 * que o aluno só lê os próprios vínculos e presenças.
 */
export default async function AlunoHorariosPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  await requireUsuario(["aluno"]);
  const aluno = await getAlunoAtual();

  if (!aluno || aluno.tipo === "online") {
    return (
      <div className="space-y-5">
        <h1 className="font-heading text-xl font-bold">Seus horários</h1>
        <PageEmpty
          icone={Clock}
          titulo="Seu acompanhamento é online"
          descricao="Você não tem horários fixos no estúdio. Seu treino fica na aba Treino."
        />
      </div>
    );
  }

  const sp = await searchParams;
  const pagina = Math.min(
    Math.max(Number.parseInt(sp.pagina ?? "0", 10) || 0, 0),
    MAX_PAGINAS - 1,
  );
  const hoje = hojeISO();
  const { inicio, fim } = janelaPagina(hoje, pagina);

  const supabase = await createClient();
  const [{ data: vincData }, { data: presData }, frequencia] = await Promise.all([
    supabase
      .from("aluno_horarios")
      .select(
        "criado_em, horarios(dia_semana, hora_inicio, hora_fim, professores(nome))",
      )
      .eq("aluno_id", aluno.id),
    supabase
      .from("presencas")
      .select("data, hora")
      .eq("aluno_id", aluno.id)
      .gte("data", inicio)
      .lte("data", fim)
      .order("data", { ascending: false }),
    getFrequenciaDoAluno(supabase, aluno.id),
  ]);

  const vinculos = ((vincData ?? []) as unknown as Vinculo[]).filter(
    (v): v is Vinculo & { horarios: NonNullable<Vinculo["horarios"]> } =>
      !!v.horarios,
  );
  // Semana começando na segunda.
  const semana = [...vinculos].sort(
    (a, b) =>
      (a.horarios.dia_semana + 6) % 7 - (b.horarios.dia_semana + 6) % 7 ||
      a.horarios.hora_inicio.localeCompare(b.horarios.hora_inicio),
  );

  const aulas = historicoAulas({
    horarios: vinculos.map((v) => ({
      dia_semana: v.horarios.dia_semana,
      hora_inicio: v.horarios.hora_inicio,
      desde: dataNoEstudio(v.criado_em),
    })),
    presencas: (presData ?? []) as { data: string; hora: string | null }[],
    inicio,
    fim,
    hoje,
  });

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-xl font-bold">Seus horários</h1>

      {/* Horários fixos da semana */}
      {semana.length === 0 ? (
        <PageEmpty
          icone={Clock}
          titulo="Nenhum horário fixo ainda"
          descricao="Quando o estúdio agendar seus horários, eles aparecem aqui."
        />
      ) : (
        <section className="space-y-2">
          <h2 className="font-heading text-base font-bold">Sua semana</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {semana.map((v, i) => (
              <li key={`${v.horarios.dia_semana}-${v.horarios.hora_inicio}-${i}`}>
                <Card className="flex-row items-center gap-3 p-4">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Clock className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {DIAS_SEMANA[v.horarios.dia_semana]}
                      <span className="ml-2 font-normal tabular-nums text-muted-foreground">
                        {horaCurta(v.horarios.hora_inicio)} às{" "}
                        {horaCurta(v.horarios.hora_fim)}
                      </span>
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <UserRound className="size-3" />
                      {v.horarios.professores?.nome ?? "Seu professor"}
                    </p>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Frequência (mesmo cartão que o professor vê) */}
      {frequencia.freq.pct !== null ? (
        <Card>
          <CardHeader>
            <CardTitle>Sua frequência</CardTitle>
          </CardHeader>
          <CardContent>
            <FrequenciaCard
              pct={frequencia.freq.pct}
              esperado={frequencia.freq.esperado}
              presente={frequencia.freq.presente}
              ultimaPresenca={
                frequencia.recentes[0]
                  ? formatData(frequencia.recentes[0].data)
                  : null
              }
            />
          </CardContent>
        </Card>
      ) : null}

      {/* Histórico de presenças e faltas */}
      <Card className="overflow-hidden p-0">
        <CardHeader className="p-5 pb-0">
          <CardTitle>Presenças e faltas</CardTitle>
          <p className="text-xs text-muted-foreground">
            {formatData(inicio)} a {formatData(fim)}
          </p>
        </CardHeader>
        {aulas.length === 0 ? (
          <PageEmpty
            icone={CalendarCheck}
            titulo="Nada neste período"
            descricao="Suas presenças aparecem aqui assim que o professor registrar."
          />
        ) : (
          <ul className="mt-3 divide-y border-t">
            {aulas.map((a, i) => (
              <li
                key={`${a.data}-${a.hora}-${i}`}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {DIAS_SEMANA[new Date(`${a.data}T12:00:00Z`).getUTCDay()]},{" "}
                    {formatData(a.data)}
                  </p>
                  {a.hora ? (
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {horaCurta(a.hora)}
                    </p>
                  ) : null}
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    SELO[a.status].classe,
                  )}
                >
                  {SELO[a.status].rotulo}
                </span>
              </li>
            ))}
          </ul>
        )}

        <nav
          aria-label="Paginação do histórico"
          className="flex items-center justify-between gap-2 border-t p-3"
        >
          {pagina < MAX_PAGINAS - 1 ? (
            <Link
              href={`/aluno/horarios?pagina=${pagina + 1}`}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5"
            >
              <ChevronLeft className="size-4" />
              Anteriores
            </Link>
          ) : (
            <span />
          )}
          {pagina > 0 ? (
            <Link
              href={
                pagina === 1 ? "/aluno/horarios" : `/aluno/horarios?pagina=${pagina - 1}`
              }
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5"
            >
              Mais recentes
              <ChevronRight className="size-4" />
            </Link>
          ) : null}
        </nav>
      </Card>
    </div>
  );
}
