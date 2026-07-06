import { HeartPulse, Smile, Sparkles, TrendingUp, Zap } from "lucide-react";
import Image from "next/image";

import { WHATSAPP_LINK } from "@/components/landing/dados";
import { IconeWhatsApp } from "@/components/landing/icone-whatsapp";
import { Revelar } from "@/components/landing/revelar";

const BENEFICIOS = [
  { icone: HeartPulse, rotulo: "Melhora na saúde" },
  { icone: Zap, rotulo: "Mais disposição" },
  { icone: TrendingUp, rotulo: "Maior produtividade" },
  { icone: Sparkles, rotulo: "Autoestima" },
  { icone: Smile, rotulo: "Qualidade de vida" },
];

/** Faixa navy com os benefícios de treinar + CTA (eco da comunicação do estúdio). */
export function Beneficios() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#021f47] via-[#033373] to-[#0353a8] text-white">
      {/* Brilhos decorativos, como no hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 size-[380px] rounded-full bg-[#0090D8]/25 blur-3xl [animation:pulse_10s_ease-in-out_infinite]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -bottom-32 size-[380px] rounded-full bg-[#00A8E4]/15 blur-3xl [animation:pulse_12s_ease-in-out_infinite]"
      />
      {/* Textura de pontos sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.3] [background-image:radial-gradient(rgba(125,211,252,0.35)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_75%)]"
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-20 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
        <div>
          <Revelar>
            <p className="text-xs font-bold tracking-widest text-[#7dd3fc] uppercase">
              Invista na sua qualidade de vida
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Por que você deve{" "}
              <span className="bg-gradient-to-r from-[#00A8E4] via-[#38bdf8] to-[#7dd3fc] bg-clip-text text-transparent">
                começar a treinar hoje?
              </span>
            </h2>
          </Revelar>

          <Revelar delay={0.12}>
            <ul className="mt-8 flex flex-wrap items-center gap-3">
              {BENEFICIOS.map((b) => {
                const Icone = b.icone;
                return (
                  <li
                    key={b.rotulo}
                    className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 py-2.5 pr-5 pl-3.5 backdrop-blur-sm transition-colors hover:border-[#00A8E4]/50 hover:bg-white/10"
                  >
                    <Icone className="size-4.5 text-[#00A8E4]" />
                    <span className="text-sm font-semibold">{b.rotulo}</span>
                  </li>
                );
              })}
            </ul>
          </Revelar>

          <Revelar delay={0.2}>
            <p className="mt-8 max-w-md text-base leading-relaxed text-white/70">
              Você não precisa evoluir sozinho. Vem treinar com a gente!
            </p>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex h-12 items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#0090D8] to-[#00A8E4] px-7 text-sm font-semibold text-white shadow-[0_8px_28px_rgba(0,144,216,0.55)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(0,168,228,0.6)] active:translate-y-0"
            >
              <IconeWhatsApp className="size-4.5" />
              Venha treinar conosco
            </a>
          </Revelar>
        </div>

        <Revelar delay={0.16} y={32} className="relative mx-auto w-full max-w-lg">
          <div className="rounded-3xl bg-gradient-to-br from-[#00A8E4]/60 via-white/10 to-transparent p-[3px] shadow-2xl">
            <div className="relative overflow-hidden rounded-[calc(1.5rem-3px)]">
              <Image
                src="/images/treinadora-sorrindo.jpg"
                alt="Personal trainer do Corpo & Saúde sorrindo no estúdio"
                width={720}
                height={430}
                sizes="(min-width: 1024px) 512px, 100vw"
                className="size-full object-cover"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-[#033373]/50 via-transparent to-transparent"
              />
            </div>
          </div>

          {/* Pills flutuantes sobre a foto */}
          <span className="animar-flutuar absolute -top-4 -left-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-[#033373] shadow-xl [animation:flutuar_6s_ease-in-out_infinite] sm:-left-6">
            + saúde
          </span>
          <span className="animar-flutuar absolute -right-2 -bottom-4 rounded-full bg-gradient-to-r from-[#0090D8] to-[#00A8E4] px-4 py-2 text-xs font-bold text-white shadow-xl [animation:flutuar_7s_ease-in-out_1s_infinite] sm:-right-6">
            + autoestima
          </span>
        </Revelar>
      </div>
    </section>
  );
}
