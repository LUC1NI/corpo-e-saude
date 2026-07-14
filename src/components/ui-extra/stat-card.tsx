import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import Link from "@/components/ui-extra/link";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TomIcone = "primary" | "sucesso" | "alerta" | "perigo";

const TOM_ICONE: Record<TomIcone, string> = {
  primary: "bg-primary/10 text-primary",
  sucesso: "bg-emerald-50 text-emerald-600",
  alerta: "bg-amber-50 text-amber-600",
  perigo: "bg-red-50 text-red-600",
};

export interface StatCardProps {
  titulo: string;
  valor: string;
  icone?: LucideIcon;
  tomIcone?: TomIcone;
  /** Texto auxiliar abaixo do valor (ex.: "+4 novos este mês"). */
  rodape?: string;
  tomRodape?: "neutro" | "sucesso" | "perigo";
  /** Se informado, o cartão vira um link para a área de detalhe. */
  href?: string;
  /** Classes extras no contêiner (ex.: col-span-2 em grades responsivas). */
  className?: string;
}

export function StatCard({
  titulo,
  valor,
  icone: Icone,
  tomIcone = "primary",
  rodape,
  tomRodape = "neutro",
  href,
  className,
}: StatCardProps) {
  const conteudo = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground sm:text-sm">
          {titulo}
        </p>
        {Icone ? (
          <span
            className={cn(
              "inline-flex size-7 shrink-0 items-center justify-center rounded-lg sm:size-8",
              TOM_ICONE[tomIcone],
            )}
          >
            <Icone className="size-4" />
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 text-xl font-bold tracking-tight text-foreground sm:mt-2 sm:text-3xl">
        {valor}
      </p>
      {rodape ? (
        <p
          className={cn(
            "mt-1 text-xs font-medium",
            tomRodape === "sucesso" && "text-emerald-600",
            tomRodape === "perigo" && "text-red-600",
            tomRodape === "neutro" && "text-muted-foreground",
          )}
        >
          {rodape}
        </p>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "group block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          className,
        )}
      >
        <Card className="relative h-full gap-0 p-4 transition-all group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:shadow-md sm:p-5">
          <ArrowUpRight className="absolute right-4 bottom-4 size-4 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
          {conteudo}
        </Card>
      </Link>
    );
  }

  return (
    <Card className={cn("h-full gap-0 p-4 sm:p-5", className)}>{conteudo}</Card>
  );
}
