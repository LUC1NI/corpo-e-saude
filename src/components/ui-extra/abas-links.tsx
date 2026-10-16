import type { LucideIcon } from "lucide-react";

import Link from "@/components/ui-extra/link";
import { cn } from "@/lib/utils";

export interface AbaLink {
  href: string;
  rotulo: string;
  icone?: LucideIcon;
  ativa: boolean;
}

/**
 * Abas de sub-página (estilo segmentado, um padrão só no sistema). No celular
 * rolam na horizontal em vez de quebrar em várias linhas.
 */
export function AbasLinks({ itens, rotulo, className }: { itens: AbaLink[]; rotulo: string; className?: string }) {
  return (
    <nav aria-label={rotulo} className={cn("-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)}>
      <div className="inline-flex gap-1 rounded-xl bg-muted p-1">
        {itens.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            aria-current={a.ativa ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3.5 text-sm whitespace-nowrap transition-colors",
              a.ativa ? "bg-card font-semibold text-foreground shadow-sm" : "font-medium text-muted-foreground hover:text-foreground",
            )}
          >
            {a.icone ? <a.icone className={cn("size-4", a.ativa ? "text-primary" : "")} /> : null}
            {a.rotulo}
          </Link>
        ))}
      </div>
    </nav>
  );
}
