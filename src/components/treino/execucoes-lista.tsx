import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Clock, MessageSquareText } from "lucide-react";

import { PageEmpty } from "@/components/ui-extra/page-empty";
import { noEstudio } from "@/lib/financeiro";
import { SENSACOES, type TreinoExecucao } from "@/lib/tipos";
import { cn } from "@/lib/utils";

function fmtDuracao(seg: number): string {
  const m = Math.round(seg / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h${String(m % 60).padStart(2, "0")}`;
}

/**
 * Histórico dos treinos que o aluno concluiu no modo treino do aplicativo —
 * o retorno do aluno para o professor (usado no detalhe do aluno).
 */
export function ExecucoesLista({
  execucoes,
  compacta = false,
}: {
  execucoes: TreinoExecucao[];
  /** Uma linha por treino ("Qua 07/10 · C · 50 min · 6/6 ✓") — visão do aluno. */
  compacta?: boolean;
}) {
  if (execucoes.length === 0) {
    return (
      <PageEmpty
        icone={CheckCircle2}
        titulo="Nenhum treino registrado"
        descricao="Quando o aluno concluir um treino pelo aplicativo, o retorno aparece aqui."
      />
    );
  }

  if (compacta) {
    return (
      <ul className="divide-y rounded-2xl border bg-card">
        {execucoes.map((e) => {
          const completo = e.exercicios_feitos >= e.exercicios_previstos;
          const sensacao = e.sensacao ? SENSACOES[e.sensacao] : null;
          const dia = format(noEstudio(e.finalizado_em), "EEE dd/MM", { locale: ptBR });
          return (
            <li key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                {e.nome_divisao}
              </span>
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium capitalize">{dia}</span>
                <span className="text-muted-foreground"> · {fmtDuracao(e.duracao_segundos)}</span>
              </span>
              {sensacao ? <span role="img" title={sensacao.rotulo} aria-label={sensacao.rotulo}>{sensacao.emoji}</span> : null}
              <span className={cn("shrink-0 text-xs font-semibold tabular-nums", completo ? "text-emerald-700" : "text-amber-700")}>
                {e.exercicios_feitos}/{e.exercicios_previstos}{completo ? " ✓" : ""}
              </span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="space-y-3">
      {execucoes.map((e) => {
        const completo = e.exercicios_feitos >= e.exercicios_previstos;
        const sensacao = e.sensacao ? SENSACOES[e.sensacao] : null;
        return (
          <li key={e.id} className="rounded-2xl border bg-card p-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                {e.nome_divisao}
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-sm font-semibold">
                  {e.foco_divisao || `Treino ${e.nome_divisao}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(noEstudio(e.finalizado_em), "EEEE, dd/MM 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium">
                <Clock className="size-3.5 text-muted-foreground" />
                {fmtDuracao(e.duracao_segundos)}
              </span>
              <span
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-semibold",
                  completo
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700",
                )}
              >
                {e.exercicios_feitos}/{e.exercicios_previstos} exercícios
              </span>
              {sensacao ? (
                <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium">
                  {sensacao.emoji} {sensacao.rotulo}
                </span>
              ) : null}
            </div>

            {e.observacao ? (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#0090D8]/8 p-3 text-sm leading-relaxed">
                <MessageSquareText className="mt-0.5 size-4 shrink-0 text-[#0090D8]" />
                <span>{e.observacao}</span>
              </p>
            ) : null}

            {e.detalhes.length > 0 ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-muted-foreground select-none hover:text-foreground">
                  Ver exercícios ({e.detalhes.length})
                </summary>
                <ul className="mt-2 space-y-1">
                  {e.detalhes.map((d, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-2 rounded-lg bg-secondary/50 px-3 py-1.5 text-xs"
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {d.nome}
                        {d.carga_usada && d.carga_usada !== d.carga ? (
                          <span className="text-muted-foreground">
                            {" "}
                            · usou <strong className="text-foreground">{d.carga_usada}</strong>
                            {d.carga ? ` (prescrito ${d.carga})` : ""}
                          </span>
                        ) : d.carga ? (
                          <span className="text-muted-foreground">
                            {" "}
                            · {d.carga}
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          "font-semibold tabular-nums",
                          d.series_feitas >= Math.max(d.series, 1)
                            ? "text-emerald-600"
                            : "text-muted-foreground",
                        )}
                      >
                        {d.series_feitas}/{d.series || "-"} séries
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
