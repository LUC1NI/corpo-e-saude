import { AppSidebar } from "@/components/shell/app-sidebar";
import { BottomNav } from "@/components/shell/bottom-nav";
import { LogoMarca } from "@/components/shell/logo-marca";
import { MenuAluno } from "@/components/shell/menu-aluno";
import { PwaInstallReminder } from "@/components/pwa/install-reminder";
import type { TipoAluno } from "@/lib/navegacao";

/**
 * Shell da área do aluno.
 *
 * - Mobile/tablet (< lg): experiência tipo app/PWA — header enxuto (marca +
 *   sair) e navegação inferior fixa; conteúdo numa coluna confortável.
 * - Desktop (lg+): mesma sidebar navy do admin/professor (navegação do aluno),
 *   sem a barra inferior; conteúdo numa área ampla.
 */
export function AlunoShell({
  nome,
  tipo,
  children,
}: {
  nome: string;
  tipo: TipoAluno;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <AppSidebar papel="aluno" nome={nome} tipoAluno={tipo} />

      <div className="lg:pl-64">
        {/* Header só no mobile/tablet (no desktop a marca/sair vivem na sidebar). */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
          <LogoMarca />
          <MenuAluno nome={nome} />
        </header>

        <main className="mx-auto w-full max-w-xl px-4 py-5 pb-24 lg:max-w-[560px] lg:py-8 lg:pb-10">
          {children}
        </main>
      </div>

      <PwaInstallReminder />
      <BottomNav tipo={tipo} />
    </div>
  );
}
