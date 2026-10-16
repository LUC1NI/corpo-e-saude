"use client";

import { CalendarDays, Play } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { MidiaThumb } from "@/components/treino/midia-thumb";
import { TreinoPlayer } from "@/components/treino/treino-player";
import { Card } from "@/components/ui/card";
import { apagarRascunho, CHAVE_RASCUNHO, lerRascunho } from "@/lib/treino-rascunho";
import { cn } from "@/lib/utils";

const assinarStorage = (aviso: () => void) => {
  window.addEventListener("storage", aviso);
  return () => window.removeEventListener("storage", aviso);
};
import { DIAS_SEMANA_CURTO, type TreinoComTudo } from "@/lib/tipos";

/** "3×8-10 · 10 kg · 60 s" — a prescrição lida de uma vez. */
function resumoPrescricao(ex: { series: number | null; repeticoes: string | null; carga: string | null; descanso: string | null }): string {
  const volume = ex.series != null && ex.repeticoes ? `${ex.series}×${ex.repeticoes}` : ex.series != null ? `${ex.series} séries` : ex.repeticoes;
  return [volume, ex.carga, ex.descanso].filter(Boolean).join(" · ");
}

/**
 * Treino do aluno com seleção por divisão. Abre na divisão de HOJE (pela
 * agenda do professor) e permite alternar entre as divisões em abas.
 *
 * `permitirIniciar` liga o "modo treino" (player com timer e retorno ao
 * professor). Vale para QUALQUER aluno com ficha ativa: o online treina
 * sempre pelo app e o presencial usa quando treina fora do estúdio (viagem,
 * treino por conta). Na aula, o professor conduz.
 */
export function TreinoDoAluno({
  treino,
  diaHoje,
  permitirIniciar = true,
}: {
  treino: TreinoComTudo;
  diaHoje: number;
  permitirIniciar?: boolean;
}) {
  const divisoes = treino.divisoes;
  const indiceHoje = divisoes.findIndex((d) => d.dias_semana.includes(diaHoje));
  const [sel, setSel] = useState(indiceHoje >= 0 ? indiceHoje : 0);
  const [treinando, setTreinando] = useState(false);
  // Treino deixado pela metade neste aparelho (lido só no navegador).
  const rascunhoBruto = useSyncExternalStore(assinarStorage, () => localStorage.getItem(CHAVE_RASCUNHO), () => null);
  const [descartado, setDescartado] = useState(false);
  const rascunho = rascunhoBruto && !descartado ? lerRascunho() : null;
  const divisaoRascunho = rascunho ? divisoes.find((d) => d.id === rascunho.divisaoId) : undefined;

  if (divisoes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sua ficha ainda não tem divisões. Fale com seu professor.
      </p>
    );
  }

  const ativa = divisoes[sel] ?? divisoes[0]!;
  const ehHoje = ativa.dias_semana.includes(diaHoje);

  if (treinando && permitirIniciar) {
    return (
      <TreinoPlayer divisao={ativa} aoFechar={() => setTreinando(false)} />
    );
  }

  return (
    <div className="space-y-4">
      {divisaoRascunho && !treinando ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <p className="min-w-0 flex-1 text-sm">
            <strong>Treino {divisaoRascunho.nome} em andamento.</strong> Suas séries marcadas estão guardadas.
          </p>
          <button
            type="button"
            onClick={() => {
              setSel(divisoes.indexOf(divisaoRascunho));
              setTreinando(true);
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            <Play className="size-4 fill-current" />
            Continuar
          </button>
          <button
            type="button"
            onClick={() => {
              apagarRascunho();
              setDescartado(true);
            }}
            className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Descartar
          </button>
        </div>
      ) : null}
      {/* Abas de divisão */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Divisões do treino">
        {divisoes.map((d, i) => {
          const hoje = d.dias_semana.includes(diaHoje);
          return (
            <button
              key={d.id}
              type="button"
              aria-pressed={i === sel}
              aria-label={`Treino ${d.nome}${d.foco ? ` · ${d.foco}` : ""}${hoje ? " (hoje)" : ""}`}
              onClick={() => setSel(i)}
              className={cn(
                "flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors",
                i === sel
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-secondary",
              )}
            >
              <span className="font-bold">{d.nome}</span>
              {hoje ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase",
                    i === sel
                      ? "bg-white/20 text-primary-foreground"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  hoje
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Divisão selecionada */}
      <Card className="gap-3 p-4">
        <div className="flex items-center justify-between gap-2 border-b pb-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
              {ativa.nome}
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">
                {ativa.foco || `Treino ${ativa.nome}`}{ehHoje ? " · hoje" : ""}
              </p>
              {ativa.dias_semana.length ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays className="size-3" />
                  {ativa.dias_semana.map((d) => DIAS_SEMANA_CURTO[d]).join(" · ")}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {ativa.exercicios.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum exercício nesta divisão.
          </p>
        ) : (
          <>
            <ul className="divide-y">
            {ativa.exercicios.map((ex) => (
              <li key={ex.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <MidiaThumb
                  url={ex.exercicio?.midia_url}
                  nome={ex.exercicio?.nome ?? "exercício"}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{ex.exercicio?.nome ?? "Exercício"}</p>
                  {resumoPrescricao(ex) ? (
                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground/80">{resumoPrescricao(ex)}</p>
                  ) : null}
                  {ex.observacao ? (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {ex.observacao}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
            </ul>
          </>
        )}
      </Card>

      {/* Botão fixo no rodapé (zona do polegar), acima do menu inferior. */}
      {permitirIniciar && ativa.exercicios.length > 0 ? (
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 lg:bottom-4">
          <button
            type="button"
            onClick={() => setTreinando(true)}
            className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-cta-de to-cta-ate text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,144,216,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,168,228,0.5)] active:translate-y-0"
          >
            <Play className="size-4.5 fill-current" />
            Começar treino {ativa.nome}
          </button>
        </div>
      ) : null}
    </div>
  );
}
