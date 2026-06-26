import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";

/**
 * Estado vazio reutilizável. Usado também como placeholder "em breve"
 * nas telas ainda não construídas, mantendo a navegação consistente.
 */
export function PageEmpty({
  icone: Icone,
  titulo,
  descricao,
  acao,
}: {
  icone?: LucideIcon;
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
}) {
  return (
    <Card className="items-center justify-center border-dashed py-16 text-center">
      {Icone ? (
        <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icone className="size-6" />
        </span>
      ) : null}
      <h3 className="text-base font-semibold text-foreground">{titulo}</h3>
      {descricao ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {descricao}
        </p>
      ) : null}
      {acao ? <div className="mt-4">{acao}</div> : null}
    </Card>
  );
}
