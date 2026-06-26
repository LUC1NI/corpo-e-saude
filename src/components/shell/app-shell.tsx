import { AppHeader } from "@/components/shell/app-header";
import { AppSidebar } from "@/components/shell/app-sidebar";
import type { Papel } from "@/lib/auth";

/**
 * Shell de aplicação (admin/professor): sidebar navy fixa no desktop,
 * drawer no mobile, header sticky e área de conteúdo sobre o fundo claro.
 */
export function AppShell({
  papel,
  nome,
  children,
}: {
  papel: Papel;
  nome: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <AppSidebar papel={papel} nome={nome} />
      <div className="lg:pl-64">
        <AppHeader papel={papel} nome={nome} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
