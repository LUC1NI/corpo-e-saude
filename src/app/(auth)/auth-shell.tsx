import Image from "next/image";

/**
 * Casca centrada com a marca, usada pelas telas de recuperar/redefinir senha.
 * Mesmo clima do painel navy do login: gradiente da marca, brilhos e textura.
 * (O login tem layout próprio, em duas colunas com painel persuasivo.)
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#021f47] via-[#033373] to-[#0353a8] p-6">
      {/* Brilhos e textura, ecoando a identidade da landing e do login */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 size-[420px] rounded-full bg-[#0090D8]/35 blur-3xl [animation:pulse_9s_ease-in-out_infinite]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -left-48 size-[380px] rounded-full bg-[#00A8E4]/20 blur-3xl [animation:pulse_11s_ease-in-out_infinite]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(rgba(125,211,252,0.35)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_75%)]"
      />

      <div className="relative mb-6 flex flex-col items-center text-center">
        <div className="mb-3 overflow-hidden rounded-2xl bg-white p-3 shadow-[0_8px_30px_rgba(2,31,71,0.45)]">
          <Image
            src="/icons/simbolo.png"
            alt="Corpo & Saúde"
            width={56}
            height={56}
            priority
          />
        </div>
        <h1 className="text-lg font-bold text-white">Corpo &amp; Saúde</h1>
        <p className="text-sm font-medium tracking-wider text-white/60 uppercase">
          Personal Trainer Studio
        </p>
      </div>
      <div className="relative w-full max-w-sm">{children}</div>
    </main>
  );
}
