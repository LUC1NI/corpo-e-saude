"use client";

import { CalendarCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AvatarIniciais } from "@/components/ui-extra/avatar-iniciais";

import { PresencaToggle } from "../../professor/presenca/presenca-toggle";

/**
 * Diálogo do admin para marcar presença de uma aula (de qualquer dia, inclusive
 * retroativo). Reusa o mesmo `PresencaToggle` do professor — a presença é
 * gravada em nome do professor da aula (`professorId`).
 */
export function MarcarAulaDialog({
  data,
  hora,
  professorId,
  professorNome,
  rotuloHorario,
  alunos,
  presentes,
}: {
  data: string;
  hora: string | null;
  professorId: string;
  professorNome: string;
  rotuloHorario: string;
  alunos: { id: string; nome: string }[];
  presentes: string[];
}) {
  const [aberto, setAberto] = useState(false);
  const presentesSet = new Set(presentes);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="w-full">
            <CalendarCheck className="size-4" />
            Marcar presença
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Presença · {rotuloHorario}</DialogTitle>
          <DialogDescription>
            {professorNome} · marque quem compareceu. Vale para qualquer dia,
            mesmo depois do horário.
          </DialogDescription>
        </DialogHeader>

        {alunos.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Nenhum aluno agendado nesta aula. Atribua alunos ao horário na grade
            do professor.
          </p>
        ) : (
          <ul className="max-h-72 divide-y overflow-y-auto rounded-lg border">
            {alunos.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <AvatarIniciais nome={a.nome} tamanho="sm" />
                  <span className="truncate text-sm font-medium">{a.nome}</span>
                </div>
                <PresencaToggle
                  alunoId={a.id}
                  data={data}
                  hora={hora}
                  presente={presentesSet.has(a.id)}
                  professorId={professorId}
                />
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
