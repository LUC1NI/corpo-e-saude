import { format, isValid, parseISO } from "date-fns";
import { Clock } from "lucide-react";

import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "@/components/ui-extra/link";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { agoraNoEstudio, hojeISO } from "@/lib/financeiro";
import { formatData, plural } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";
import { DIAS_SEMANA, horaCurta } from "@/lib/tipos";
import { cn } from "@/lib/utils";

import { MarcarAulaDialog } from "./marcar-aula-dialog";
import { SeletorData } from "./seletor-data";

/** Data da URL só se for real ("2026-02-31" vira undefined = hoje). */
export function dataDaUrl(valor?: string): string | undefined {
  if (!valor) return undefined;
  const d = parseISO(valor);
  return isValid(d) && format(d, "yyyy-MM-dd") === valor ? valor : undefined;
}

/**
 * Chamada do dia: uma linha por aula com aluno, a de agora primeiro.
 * Dono vê o estúdio todo; professor (`professorId`) só as aulas dele.
 * `data` já chega validada (yyyy-MM-dd) ou vazia (= hoje).
 */
export async function AulasDoDia({
  data: dataParam,
  mostrarVazios,
  basePath,
  professorId,
}: {
  data?: string;
  mostrarVazios: boolean;
  basePath: string;
  professorId?: string;
}) {
  const supabase = await createClient();
  const hoje = hojeISO();
  const data = dataParam ?? hoje;
  const diaSel = new Date(`${data}T00:00:00`).getDay();
  const ehHoje = data === hoje;
  const agora = format(agoraNoEstudio(), "HH:mm");

  let horariosQ = supabase
    .from("horarios")
    .select("id, hora_inicio, hora_fim, capacidade, professor_id, professores(nome), aluno_horarios(alunos(id, nome, status))")
    .eq("dia_semana", diaSel)
    .order("hora_inicio");
  let presencasQ = supabase.from("presencas").select("aluno_id, professor_id, hora").eq("data", data);
  if (professorId) {
    horariosQ = horariosQ.eq("professor_id", professorId);
    presencasQ = presencasQ.eq("professor_id", professorId);
  }
  const [{ data: horsDiaData }, { data: presDiaData }] = await Promise.all([horariosQ, presencasQ]);

  const horsDia = (horsDiaData ?? []) as unknown as {
    id: string;
    hora_inicio: string;
    hora_fim: string;
    capacidade: number | null;
    professor_id: string;
    professores: { nome: string } | null;
    aluno_horarios: { alunos: { id: string; nome: string; status: string } | null }[];
  }[];
  const presDia = (presDiaData ?? []) as { aluno_id: string; professor_id: string | null; hora: string | null }[];

  const aulasDia = horsDia.map((h) => ({
    ...h,
    // Só alunos ativos entram na chamada.
    alunos: h.aluno_horarios
      .map((v) => v.alunos)
      .filter((a): a is { id: string; nome: string; status: string } => !!a && a.status === "ativo")
      .map((a) => ({ id: a.id, nome: a.nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome)),
    presentes: presDia
      .filter((p) => p.professor_id === h.professor_id && p.hora === h.hora_inicio)
      .map((p) => p.aluno_id),
    emAndamento: ehHoje && h.hora_inicio.slice(0, 5) <= agora && agora < h.hora_fim.slice(0, 5),
  }));
  // Aula sem aluno fixo nem presença é ruído: fica atrás de um link
  // (ainda dá para abrir e lançar um avulso).
  const comAlunos = aulasDia.filter((a) => a.alunos.length > 0 || a.presentes.length > 0);
  const vazias = aulasDia.length - comAlunos.length;
  const lista = mostrarVazios ? aulasDia : comAlunos;
  // Hoje: a de agora e as próximas primeiro; as que acabaram vão para o fim
  // (continuam lá para lançar presença atrasada).
  const acabou = (a: (typeof aulasDia)[number]) => ehHoje && a.hora_fim.slice(0, 5) <= agora;
  const visiveis = [...lista.filter((a) => !acabou(a)), ...lista.filter(acabou)];
  const presentesNoDia = new Set(presDia.map((p) => `${p.aluno_id}|${p.hora}`)).size;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {ehHoje ? "Hoje" : formatData(data)} · {DIAS_SEMANA[diaSel]}
        </CardTitle>
        <CardAction>
          <span className="text-sm text-muted-foreground">{plural(presentesNoDia, "presença", "presenças")}</span>
        </CardAction>
      </CardHeader>
      <div className="px-6 pb-2">
        <SeletorData data={data} basePath={basePath} />
      </div>
      {visiveis.length === 0 ? (
        <PageEmpty
          icone={Clock}
          titulo={aulasDia.length === 0 ? "Nenhuma aula neste dia" : "Nenhum aluno nas aulas deste dia"}
          descricao={
            aulasDia.length === 0
              ? "Não há aulas na grade para este dia."
              : "As aulas existem, mas estão vazias."
          }
        />
      ) : (
        <ul className="mx-4 mb-2 divide-y rounded-xl border sm:mx-6">
          {visiveis.map((a) => (
            <li
              key={a.id}
              className={cn(
                "flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3",
                a.emAndamento && "bg-primary/5",
                acabou(a) && a.presentes.length === 0 && "opacity-90",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-semibold tabular-nums">
                  {horaCurta(a.hora_inicio)}–{horaCurta(a.hora_fim)}
                  {a.emAndamento ? (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">agora</span>
                  ) : null}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {professorId ? "" : `${a.professores?.nome ?? "-"} · `}
                  {a.presentes.length > a.alunos.length
                    ? `${a.presentes.length} presentes · ${a.alunos.length} na aula`
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
          ))}
        </ul>
      )}
      {vazias > 0 ? (
        <div className="px-6 pb-5">
          <Link
            href={`${basePath}?data=${data}${mostrarVazios ? "" : "&vazios=1"}`}
            className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline sm:min-h-0"
          >
            {mostrarVazios ? "Esconder aulas vazias" : `Mostrar ${plural(vazias, "aula vazia", "aulas vazias")}`}
          </Link>
        </div>
      ) : (
        <div className="pb-4" />
      )}
    </Card>
  );
}
