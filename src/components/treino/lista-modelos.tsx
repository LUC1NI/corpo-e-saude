import { ChevronRight, Dumbbell, Sparkles } from "lucide-react";

import Link from "@/components/ui-extra/link";
import { Card } from "@/components/ui/card";
import type { TreinoComTudo } from "@/lib/tipos";

/**
 * Grade de treinos-modelo (reutilizáveis). Cada card abre a página do
 * treino para montar/editar. `basePath` = "/professor/treinos" ou
 * "/admin/treinos".
 */
export function ListaModelos({
  modelos,
  basePath,
}: {
  modelos: TreinoComTudo[];
  basePath: string;
}) {
  if (modelos.length === 0) {
    return (
      <Card className="flex-row items-center gap-3 p-4">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="size-5" />
        </span>
        <p className="text-sm text-muted-foreground">
          Monte aqui os treinos que você mais usa (ex.: ABC hipertrofia,
          full-body iniciante) e aplique a qualquer aluno com um clique.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {modelos.map((m) => {
        const nEx = m.divisoes.reduce((s, d) => s + d.exercicios.length, 0);
        return (
          <Link
            key={m.id}
            href={`${basePath}/${m.id}`}
            className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <Card className="h-full flex-row items-center gap-3 p-4 transition-all group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:shadow-md">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Dumbbell className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{m.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {m.divisoes.length > 0
                    ? `${m.divisoes.map((d) => d.nome).join(" · ")} · ${nEx} exercício(s)`
                    : "Sem dias de treino ainda"}
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
