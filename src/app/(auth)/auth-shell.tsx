import Image from "next/image";

/**
 * Casca centrada com a marca, usada pelas telas de recuperar/redefinir senha.
 * (O login tem layout próprio, em duas colunas com painel persuasivo.)
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background p-6">
      {/* Brilhos sutis, ecoando a identidade da landing */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 size-[420px] rounded-full bg-[#0090D8]/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -left-48 size-[380px] rounded-full bg-[#033373]/8 blur-3xl"
      />

      <div className="relative mb-6 flex flex-col items-center text-center">
        <div className="mb-3 overflow-hidden rounded-2xl border bg-white p-3 shadow-sm">
          <Image
            src="/icons/icon-192.png"
            alt="Corpo & Saúde"
            width={56}
            height={56}
            priority
          />
        </div>
        <h1 className="text-lg font-bold text-[#033373]">Corpo &amp; Saúde</h1>
        <p className="text-sm text-muted-foreground">Personal Trainer Studio</p>
      </div>
      <div className="relative w-full max-w-sm">{children}</div>
    </main>
  );
}
