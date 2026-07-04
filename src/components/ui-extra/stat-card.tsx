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
}

export function StatCard({
  titulo,
  valor,
  icone: Icone,
  tomIcone = "primary",
  rodape,
  tomRodape = "neutro",
  href,
}: StatCardProps) {
  const conteudo = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{titulo}</p>
        {Icone ? (
          <span
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-lg",
              TOM_ICONE[tomIcone],
            )}
          >
            <Icone className="size-4" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
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
        className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <Card className="relative gap-0 p-5 transition-all group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:shadow-md">
          <ArrowUpRight className="absolute right-4 bottom-4 size-4 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
          {conteudo}
        </Card>
      </Link>
    );
  }

  return <Card className="gap-0 p-5">{conteudo}</Card>;
}
