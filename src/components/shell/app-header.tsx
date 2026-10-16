import { BuscaAlunos } from "@/components/shell/busca-alunos";
import { LogoMarca } from "@/components/shell/logo-marca";
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
        <BuscaAlunos basePath={basePath} />
        <NotificacoesButton itens={alertas} mensagemVazia={mensagemVazia} />
      </div>
    </header>
  );
}
