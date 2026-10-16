"use client";

import { CalendarCheck, CheckCircle2 } from "lucide-react";
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

import { MarcarTodos } from "@/app/(app)/professor/presenca/marcar-todos";
import { PresencaToggle } from "@/app/(app)/professor/presenca/presenca-toggle";
import { cn } from "@/lib/utils";

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
  const feita = alunos.length > 0 && alunos.every((a) => presentesSet.has(a.id));

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger
        render={
          <Button variant={feita ? "ghost" : "outline"} size="sm" className={cn("min-h-11 sm:min-h-8", feita && "text-emerald-700")}>
            {feita ? <CheckCircle2 className="size-4" /> : <CalendarCheck className="size-4" />}
            {feita ? "Chamada feita" : "Fazer chamada"}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Presença · {rotuloHorario}</DialogTitle>
          <DialogDescription>
            {professorNome} · toque em quem veio.
          </DialogDescription>
        </DialogHeader>

        {alunos.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Nenhum aluno nesta aula. Inclua alunos tocando na aula em Horários.
          </p>
        ) : (
          <>
          <MarcarTodos alunoIds={alunos.filter((a) => !presentesSet.has(a.id)).map((a) => a.id)} data={data} hora={hora} professorId={professorId} />
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
