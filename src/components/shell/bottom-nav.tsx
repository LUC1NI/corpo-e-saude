"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navAluno } from "@/lib/navegacao";
import { cn } from "@/lib/utils";

function ativo(pathname: string, href: string): boolean {
  return href === "/aluno"
    ? pathname === "/aluno"
    : pathname === href || pathname.startsWith(href + "/");
}

/** Navegação inferior fixa da área do aluno (mobile/PWA). */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-md items-stretch justify-around px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))]">
        {navAluno.map((item) => {
          const Icone = item.icone;
          const selecionado = ativo(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={selecionado ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors",
                selecionado
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icone className="size-5" />
              {item.titulo}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
