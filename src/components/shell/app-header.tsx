import { Search } from "lucide-react";

import { LogoMarca } from "@/components/shell/logo-marca";
import { MobileSidebar } from "@/components/shell/mobile-sidebar";
import Link from "@/components/ui-extra/link";
import {
  NotificacoesButton,
  type AlertaNotificacao,
} from "@/components/shell/notificacoes-button";
import type { Papel } from "@/lib/auth";

/** Barra superior: gatilho do menu (mobile), busca e notificações. */
export function AppHeader({
  papel,
  nome,
  alertas,
  mensagemVazia,
}: {
  papel: Papel;
  nome: string;
  alertas: AlertaNotificacao[];
  mensagemVazia: string;
}) {
  const basePath = papel === "professor" ? "/professor/alunos" : "/admin/alunos";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur lg:px-8">
      <MobileSidebar papel={papel} nome={nome} />
      <div className="lg:hidden">
        <LogoMarca compacta />
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
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
        <NotificacoesButton itens={alertas} mensagemVazia={mensagemVazia} />
      </div>
    </header>
  );
}
