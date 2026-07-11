"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type TomIcone = "primary" | "sucesso" | "alerta" | "perigo";

const TOM_ICONE: Record<TomIcone, string> = {
  primary: "bg-primary/10 text-primary",
  sucesso: "bg-emerald-50 text-emerald-600",
  alerta: "bg-amber-50 text-amber-600",
  perigo: "bg-red-50 text-red-600",
};

/**
 * Card de indicador do financeiro que abre um diálogo com o detalhamento
 * daquele número (as linhas que o compõem). O conteúdo (`children`) é montado
 * no servidor e passado para cá — este componente só cuida do clique/diálogo.
 */
export function StatCardDialog({
  titulo,
  valor,
  icone: Icone,
  tomIcone = "primary",
  descricao,
  children,
}: {
  titulo: string;
  valor: string;
  icone: LucideIcon;
  tomIcone?: TomIcone;
  descricao: string;
  children: ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className="group block w-full rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        }
      >
        <Card className="relative gap-0 p-5 transition-all group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:shadow-md">
          <ArrowUpRight className="absolute right-4 bottom-4 size-4 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">{titulo}</p>
            <span
              className={cn(
                "inline-flex size-8 items-center justify-center rounded-lg",
                TOM_ICONE[tomIcone],
              )}
            >
              <Icone className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            {valor}
          </p>
          <p className="mt-1 text-xs font-medium text-primary/70">
            Ver detalhes
          </p>
        </Card>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>
        <div className="rounded-xl bg-secondary/50 p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{valor}</p>
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}

/** Linha padrão do detalhamento: nome à esquerda, valor/legenda à direita. */
export function LinhaDetalhe({
  titulo,
  subtitulo,
  valor,
  badge,
}: {
  titulo: string;
  subtitulo?: string;
  valor: string;
  badge?: ReactNode;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{titulo}</p>
        {subtitulo ? (
          <p className="truncate text-xs text-muted-foreground">{subtitulo}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {badge}
        <span className="text-sm font-semibold tabular-nums">{valor}</span>
      </div>
    </li>
  );
}
