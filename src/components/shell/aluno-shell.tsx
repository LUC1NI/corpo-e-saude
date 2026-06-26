import { BottomNav } from "@/components/shell/bottom-nav";
import { LogoMarca } from "@/components/shell/logo-marca";
import { LogoutButton } from "@/components/logout-button";

/**
 * Shell da área do aluno: mobile-first, coluna centralizada (max-w-md),
 * barra superior enxuta e navegação inferior fixa (PWA).
 */
export function AlunoShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background pb-24">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-3">
          <LogoMarca />
          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto w-full max-w-md px-4 py-5">{children}</div>

      <BottomNav />
    </div>
  );
}
