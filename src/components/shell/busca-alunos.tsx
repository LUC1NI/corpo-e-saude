"use client";

import { Search } from "lucide-react";
import { usePathname } from "next/navigation";

import Link from "@/components/ui-extra/link";

/** Busca global de aluno. Some na própria lista (lá a busca combina com os filtros). */
export function BuscaAlunos({ basePath }: { basePath: string }) {
  if (usePathname() === basePath) return null;
  return (
    <>
      <Link
        href={basePath}
        aria-label="Buscar aluno"
        className="inline-flex size-11 items-center justify-center rounded-lg border bg-background text-muted-foreground sm:hidden"
      >
        <Search className="size-5" />
      </Link>
      {/* Form GET: Enter navega para a lista de alunos já filtrada. */}
      <form action={basePath} className="relative hidden sm:block">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          name="q"
          placeholder="Buscar aluno…"
          aria-label="Buscar aluno"
          className="h-9 w-56 rounded-lg border bg-secondary/60 pr-3 pl-9 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      </form>
    </>
  );
}
