import { ArrowRight, CalendarCheck } from "lucide-react";
import Image from "next/image";

import { WHATSAPP_LINK } from "@/components/landing/dados";
import { IconeWhatsApp } from "@/components/landing/icone-whatsapp";
import { Revelar } from "@/components/landing/revelar";

/** Hero navy: headline, subtítulo, CTAs e foto real do estúdio. */
export function Hero() {
  return (
    <section
      id="inicio"
      className="relative overflow-hidden bg-[#033373] text-white"
    >
      {/* Brilhos decorativos sutis */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 size-[480px] rounded-full bg-[#0090D8]/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -left-48 size-[420px] rounded-full bg-[#00A8E4]/15 blur-3xl"
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-28 pb-16 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:pt-40 lg:pb-28">
        <div>
          <Revelar>
            <p className="inline-flex items-center rounded-full border border-[#00A8E4]/40 bg-[#0090D8]/15 px-3.5 py-1.5 text-[11px] font-semibold tracking-widest text-[#7dd3fc] uppercase">
              Personal Trainer Studio · Mafra/SC
            </p>
          </Revelar>

          <Revelar delay={0.08}>
            <h1 className="mt-5 text-4xl leading-[1.08] font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Transforme-se na melhor versão{" "}
              <span className="text-[#00A8E4]">de você</span>
            </h1>
          </Revelar>

          <Revelar delay={0.16}>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/70 sm:text-lg">
              Treino personalizado, acompanhamento de perto e resultados de
              verdade. Presencial e online, no seu ritmo.
            </p>
          </Revelar>

          <Revelar delay={0.24}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2.5 rounded-xl bg-[#0090D8] px-6 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,144,216,0.45)] transition-all hover:-translate-y-0.5 hover:bg-[#00A8E4] active:translate-y-0"
              >
                <IconeWhatsApp className="size-4.5" />
                Agendar aula experimental
              </a>
              <a
                href="#sobre"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/25 px-6 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/10 active:translate-y-0"
              >
                Conhecer o estúdio
                <ArrowRight className="size-4" />
              </a>
            </div>
          </Revelar>
        </div>

        <Revelar delay={0.2} y={32} className="relative">
          <div className="relative overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/15">
            <Image
              src="/images/instrutores-estudio.jpg"
              alt="Instrutores do Corpo & Saúde orientando treino com halteres no estúdio"
              width={1080}
              height={1080}
              priority
              sizes="(min-width: 1024px) 540px, 100vw"
              className="size-full object-cover"
            />
            {/* Véu sutil para integrar a foto ao navy */}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-[#033373]/40 via-transparent to-transparent"
            />
          </div>

          {/* Selo flutuante */}
          <div className="absolute -bottom-5 left-5 flex items-center gap-3 rounded-2xl bg-white p-3.5 pr-5 shadow-xl ring-1 ring-black/5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#0090D8]/10 text-[#0090D8]">
              <CalendarCheck className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold text-[#18181A]">
                Acompanhamento de perto
              </span>
              <span className="block text-xs text-[#5a6b80]">
                presencial e online
              </span>
            </span>
          </div>
        </Revelar>
      </div>
    </section>
  );
}
