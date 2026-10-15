"use client";

import { Dumbbell, Plus } from "lucide-react";
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


  return (
    <div className="space-y-5">
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Dumbbell className="mt-0.5 size-4 shrink-0 text-primary" />
        Aluno presencial: o treino é montado na aula. Ficha no app é opcional.
      </p>
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
