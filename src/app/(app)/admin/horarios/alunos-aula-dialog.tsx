"use client";

import { Users } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AvatarIniciais } from "@/components/ui-extra/avatar-iniciais";
import { cn } from "@/lib/utils";
import { plural } from "@/lib/formato";

export function AlunosAulaDialog({
  professorNome,
  rotulo,
  capacidade,
  alunos,
}: {
  professorNome: string;
  rotulo: string;
  capacidade: number | null;
  alunos: { id: string; nome: string }[];
}) {
  const n = alunos.length;
  const cheio = capacidade != null && n >= capacidade;
  const livre = n === 0;

  return (
    <Dialog>
      <DialogTrigger
        aria-label={`Ver alunos de ${professorNome} às ${rotulo}`}
        className={cn(
          "inline-flex min-w-14 items-center justify-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-transform hover:scale-105 focus-visible:ring-2",
          cheio
            ? "bg-amber-50 text-amber-700 ring-amber-600/20"
            : livre
              ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
              : "bg-sky-50 text-sky-700 ring-sky-600/20",
        )}
      >
        {livre ? "Livre" : `${n}${capacidade != null ? `/${capacidade}` : ""}`}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {professorNome} · {rotulo}
          </DialogTitle>
          <DialogDescription>
            {plural(n, "aluno agendado", "alunos agendados")}
            {capacidade != null ? ` de ${plural(capacidade, "vaga", "vagas")}` : ""}.
          </DialogDescription>
        </DialogHeader>

        {alunos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Users className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium">Nenhum aluno nesta aula</p>
            <p className="text-xs text-muted-foreground">
              O professor atribui os alunos desta aula na tela de Horários.
            </p>
          </div>
        ) : (
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {alunos.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/60"
              >
                <AvatarIniciais nome={a.nome} tamanho="sm" />
                <span className="text-sm font-medium">{a.nome}</span>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
