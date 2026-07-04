import { Search } from "lucide-react";

import { MobileSidebar } from "@/components/shell/mobile-sidebar";
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
}: {
  papel: Papel;
  nome: string;
  alertas: AlertaNotificacao[];
}) {
  const basePath = papel === "professor" ? "/professor/alunos" : "/admin/alunos";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur lg:px-8">
      <MobileSidebar papel={papel} nome={nome} />

      <div className="flex flex-1 items-center justify-end gap-2">
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
        <NotificacoesButton itens={alertas} basePath={basePath} />
      </div>
    </header>
  );
}
