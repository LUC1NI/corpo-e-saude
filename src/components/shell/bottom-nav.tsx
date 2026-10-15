"use client";

import Link from "@/components/ui-extra/link";
import { usePathname } from "next/navigation";

import type { Papel } from "@/lib/auth";
import { navInferior, type TipoAluno } from "@/lib/navegacao";
import { cn } from "@/lib/utils";

function ativo(pathname: string, href: string): boolean {
  // Raiz do perfil (/aluno, /admin, /professor) só na rota exata.
  return href.split("/").filter(Boolean).length <= 1
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");
}

/** Navegação inferior fixa no celular (aluno, dono e professor). */
export function BottomNav({ papel = "aluno", tipo = "presencial" }: { papel?: Papel; tipo?: TipoAluno }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur lg:hidden">
      <div className="mx-auto flex w-full max-w-md items-stretch justify-around px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))]">
        {navInferior(papel, tipo).map((item) => {
          const Icone = item.icone;
          const selecionado = ativo(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={selecionado ? "page" : undefined}
              className={cn(
                "flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium transition-colors",
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
