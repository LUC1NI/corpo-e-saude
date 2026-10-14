import { SidebarInner } from "@/components/shell/sidebar-inner";
import type { Papel } from "@/lib/auth";
import type { TipoAluno } from "@/lib/navegacao";

/** Sidebar fixa do desktop (oculta no mobile; o conteúdo usa lg:pl-64). */
export function AppSidebar({
  papel,
  nome,
  tipoAluno,
}: {
  papel: Papel;
  nome: string;
  tipoAluno?: TipoAluno;
}) {
  return (
    <div className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
      <SidebarInner papel={papel} nome={nome} tipoAluno={tipoAluno} />
    </div>
  );
}
