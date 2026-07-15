"use client";

import { CalendarDays, Play } from "lucide-react";
import { useState } from "react";

import { MidiaThumb } from "@/components/treino/midia-thumb";
import { TreinoPlayer } from "@/components/treino/treino-player";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DIAS_SEMANA, DIAS_SEMANA_CURTO, type TreinoComTudo } from "@/lib/tipos";

function Chip({ rotulo, valor }: { rotulo: string; valor: string | number }) {
  return (
    <span className="inline-flex items-baseline gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className="font-semibold">{valor}</span>
    </span>
  );
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
      {/* Abas de divisão */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {divisoes.map((d, i) => {
          const hoje = d.dias_semana.includes(diaHoje);
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setSel(i)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                i === sel
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-secondary",
              )}
            >
              <span className="font-bold">{d.nome}</span>
              {d.foco ? (
                <span
                  className={cn(
                    "text-xs",
                    i === sel ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {d.foco}
                </span>
              ) : null}
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
                {ehHoje ? "Treino de hoje" : ativa.foco || "Treino"}
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
            {permitirIniciar ? (
              <button
                type="button"
                onClick={() => setTreinando(true)}
                className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#0090D8] to-[#00A8E4] text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,144,216,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,168,228,0.5)] active:translate-y-0"
              >
                <Play className="size-4.5 fill-current" />
                Iniciar treino
              </button>
            ) : null}
            <ul className="divide-y">
            {ativa.exercicios.map((ex) => (
              <li key={ex.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <MidiaThumb
                  url={ex.exercicio?.midia_url}
                  nome={ex.exercicio?.nome ?? "exercício"}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{ex.exercicio?.nome ?? "Exercício"}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {ex.series != null ? <Chip rotulo="Séries" valor={ex.series} /> : null}
                    {ex.repeticoes ? <Chip rotulo="Reps" valor={ex.repeticoes} /> : null}
                    {ex.carga ? <Chip rotulo="Carga" valor={ex.carga} /> : null}
                    {ex.descanso ? <Chip rotulo="Descanso" valor={ex.descanso} /> : null}
                  </div>
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

      <p className="text-center text-xs text-muted-foreground">
        Hoje é {DIAS_SEMANA[diaHoje]}.
      </p>
    </div>
  );
}
