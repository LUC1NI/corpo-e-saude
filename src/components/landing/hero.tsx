import { ArrowRight, CalendarCheck, Star } from "lucide-react";
import Image from "next/image";

import { WHATSAPP_LINK } from "@/components/landing/dados";
import { IconeWhatsApp } from "@/components/landing/icone-whatsapp";
import { Revelar } from "@/components/landing/revelar";

/** Hero navy: headline, subtítulo, CTAs e foto real do estúdio. */
export function Hero() {
  return (
    <section
      id="inicio"
      className="relative overflow-hidden bg-gradient-to-br from-[#021f47] via-[#033373] to-[#0353a8] text-white"
    >
      {/* Brilhos decorativos com pulso lento */}
      <div
        aria-hidden
        className="animar-flutuar pointer-events-none absolute -top-40 -right-40 size-[520px] rounded-full bg-[#0090D8]/35 blur-3xl [animation:pulse_9s_ease-in-out_infinite]"
      />
      <div
        aria-hidden
        className="animar-flutuar pointer-events-none absolute -bottom-48 -left-48 size-[460px] rounded-full bg-[#00A8E4]/20 blur-3xl [animation:pulse_11s_ease-in-out_infinite]"
      />
      {/* Textura de pontos sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(rgba(125,211,252,0.35)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_75%)]"
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-28 pb-16 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:pt-40 lg:pb-28">
        <div>
          <Revelar>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#00A8E4]/40 bg-[#0090D8]/15 px-3.5 py-1.5 text-[11px] font-semibold tracking-widest text-[#7dd3fc] uppercase backdrop-blur-sm">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#00E58A] opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-[#00E58A]" />
              </span>
              Personal Trainer Studio · Mafra/SC
            </p>
          </Revelar>

          <Revelar delay={0.08}>
            <h1 className="mt-5 text-4xl leading-[1.08] font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Transforme-se na melhor versão{" "}
              <span className="bg-gradient-to-r from-[#00A8E4] via-[#38bdf8] to-[#7dd3fc] bg-clip-text text-transparent">
                de você
              </span>
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
                className="inline-flex h-12 items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#0090D8] to-[#00A8E4] px-6 text-sm font-semibold text-white shadow-[0_8px_28px_rgba(0,144,216,0.55)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(0,168,228,0.6)] active:translate-y-0"
              >
                <IconeWhatsApp className="size-4.5" />
                Agendar aula experimental
              </a>
              <a
                href="#sobre"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/25 px-6 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/10 active:translate-y-0"
              >
                Conhecer o estúdio
                <ArrowRight className="size-4" />
              </a>
            </div>
          </Revelar>

          <Revelar delay={0.32}>
            <div className="mt-8 flex items-center gap-3 text-sm text-white/70">
              <span className="flex text-[#facc15]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-4 fill-current" />
                ))}
              </span>
              <span>
                <strong className="font-semibold text-white">+300 alunos</strong>{" "}
                atendidos em 15 anos de estúdio
              </span>
            </div>
          </Revelar>
        </div>

        <Revelar delay={0.2} y={32} className="relative">
          {/* Moldura em gradiente ao redor da foto */}
          <div className="relative rounded-3xl bg-gradient-to-br from-[#00A8E4]/60 via-white/10 to-transparent p-[3px] shadow-2xl">
            <div className="relative overflow-hidden rounded-[calc(1.5rem-3px)]">
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
                className="absolute inset-0 bg-gradient-to-t from-[#033373]/45 via-transparent to-transparent"
              />
            </div>
          </div>

          {/* Selo flutuante: acompanhamento */}
          <div className="animar-flutuar absolute -bottom-5 left-5 flex items-center gap-3 rounded-2xl bg-white p-3.5 pr-5 shadow-xl ring-1 ring-black/5 [animation:flutuar_7s_ease-in-out_infinite]">
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

          {/* Selo flutuante: anos de história */}
          <div className="animar-flutuar absolute -top-4 -right-2 hidden items-center gap-2.5 rounded-2xl bg-white/95 px-4 py-3 shadow-xl ring-1 ring-black/5 backdrop-blur-sm sm:flex [animation:flutuar_6s_ease-in-out_1.2s_infinite]">
            <span className="bg-gradient-to-r from-[#0090D8] to-[#033373] bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">
              15
            </span>
            <span className="text-xs leading-tight font-semibold text-[#18181A]">
              anos de
              <br />
              história
            </span>
          </div>
        </Revelar>
      </div>
    </section>
  );
}
