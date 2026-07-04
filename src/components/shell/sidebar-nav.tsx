"use client";

import Link from "@/components/ui-extra/link";
import { usePathname } from "next/navigation";

import type { ItemNav } from "@/lib/navegacao";
import { cn } from "@/lib/utils";

function estaAtivo(pathname: string, href: string): boolean {
  // O item raiz (ex.: /admin) só fica ativo na rota exata; os demais
  // ficam ativos também nas subrotas (ex.: /admin/alunos/123).
  const segmentos = href.split("/").filter(Boolean);
  if (segmentos.length <= 1) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export function SidebarNav({
  itens,
  onNavegar,
}: {
  itens: ItemNav[];
  onNavegar?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1">
      {itens.map((item) => {
        const ativo = estaAtivo(pathname, item.href);
        const Icone = item.icone;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavegar}
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              ativo
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-white/70 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icone className="size-[18px] shrink-0" />
            {item.titulo}
          </Link>
        );
      })}
    </nav>
  );
}
