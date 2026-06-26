import { SidebarInner } from "@/components/shell/sidebar-inner";
import type { Papel } from "@/lib/auth";

/** Sidebar fixa do desktop (oculta no mobile; o conteúdo usa lg:pl-64). */
export function AppSidebar({ papel, nome }: { papel: Papel; nome: string }) {
  return (
    <div className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
      <SidebarInner papel={papel} nome={nome} />
    </div>
  );
}
