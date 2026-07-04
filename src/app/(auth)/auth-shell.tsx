import Image from "next/image";

/**
 * Casca centrada com a marca, usada pelas telas de recuperar/redefinir senha.
 * (O login tem layout próprio, em duas colunas com painel persuasivo.)
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background p-6">
      <div className="mb-6 flex flex-col items-center text-center">
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
      {children}
    </main>
  );
}
