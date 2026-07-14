"use client";

import { CalendarClock, Dumbbell, HandMetal, Plus, Users } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { TreinosEditor } from "@/components/treino/treinos-editor";
import type { Exercicio, TreinoComTudo } from "@/lib/tipos";

/**
 * Área de treino para o aluno PRESENCIAL.
 *
 * Diferente do aluno online, o presencial treina com o professor na aula — a
 * prescrição é definida na hora, conforme o dia. Por isso não faz sentido
 * empurrar o editor de ficha aqui: mostramos um painel explicativo e deixamos
 * a prescrição como uma opção secundária (regra de negócio: é opcional).
 */
export function TreinoPresencial({
  alunoId,
  treinos,
  exercicios,
  modelos,
}: {
  alunoId: string;
  treinos: TreinoComTudo[];
  exercicios: Exercicio[];
  modelos: TreinoComTudo[];
}) {
  // Se já existe ficha cadastrada, mostramos o editor direto (alguém optou por
  // prescrever). Caso contrário, o painel explicativo é o padrão.
  const [prescrever, setPrescrever] = useState(treinos.length > 0);

  const pontos = [
    {
      icone: CalendarClock,
      titulo: "Definido no dia",
      texto:
        "O professor monta o treino na hora da aula, de acordo com o objetivo e a disposição do aluno.",
    },
    {
      icone: HandMetal,
      titulo: "Acompanhamento ao vivo",
      texto:
        "Execução, carga e correções são ajustadas presencialmente, série a série.",
    },
    {
      icone: Users,
      titulo: "Sem ficha obrigatória",
      texto:
        "Não é preciso cadastrar nada aqui — o treino acontece no estúdio, com o profissional.",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Painel explicativo com a identidade da marca. */}
      <div className="overflow-hidden rounded-2xl border bg-gradient-to-br from-[#033373] to-[#0090D8] p-6 text-white shadow-sm">
        <div className="flex items-start gap-4">
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Dumbbell className="size-6" />
          </span>
          <div className="min-w-0">
            <h3 className="font-heading text-lg font-bold">
              Treino conduzido no estúdio
            </h3>
            <p className="mt-1 text-sm text-white/85">
              Este é um aluno <strong>presencial</strong>. O treino é montado e
              conduzido pelo professor durante a aula, ajustado a cada dia
              conforme a evolução e os objetivos do aluno.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {pontos.map((p) => (
            <div
              key={p.titulo}
              className="rounded-xl bg-white/10 p-3.5 backdrop-blur"
            >
              <p.icone className="size-5 text-white/90" />
              <p className="mt-2 text-sm font-semibold">{p.titulo}</p>
              <p className="mt-0.5 text-xs leading-snug text-white/75">
                {p.texto}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Prescrição opcional. */}
      {prescrever ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Ficha opcional — o aluno vê no app para consultar entre as aulas.
            </p>
            {treinos.length === 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setPrescrever(false)}
              >
                Cancelar
              </Button>
            ) : null}
          </div>
          <TreinosEditor
            alunoId={alunoId}
            treinos={treinos}
            exercicios={exercicios}
            modelos={modelos}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-5 text-center">
          <p className="text-sm text-muted-foreground">
            Quer, mesmo assim, deixar uma ficha registrada para o aluno
            consultar no aplicativo? É totalmente opcional.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPrescrever(true)}
          >
            <Plus className="size-4" />
            Prescrever ficha (opcional)
          </Button>
        </div>
      )}
    </div>
  );
}
