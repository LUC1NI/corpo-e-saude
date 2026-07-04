import { HeartPulse, Smile, Sparkles, TrendingUp, Zap } from "lucide-react";

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
    <section className="relative overflow-hidden bg-[#033373] text-white">
      {/* Brilhos decorativos, como no hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 size-[380px] rounded-full bg-[#0090D8]/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -bottom-32 size-[380px] rounded-full bg-[#00A8E4]/15 blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-20 text-center lg:px-8 lg:py-24">
        <Revelar>
          <p className="text-xs font-bold tracking-widest text-[#7dd3fc] uppercase">
            Invista na sua qualidade de vida
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Por que você deve começar a treinar hoje?
          </h2>
        </Revelar>

        <Revelar delay={0.12}>
          <ul className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {BENEFICIOS.map((b) => {
              const Icone = b.icone;
              return (
                <li
                  key={b.rotulo}
                  className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 py-2.5 pr-5 pl-3.5 backdrop-blur-sm"
                >
                  <Icone className="size-4.5 text-[#00A8E4]" />
                  <span className="text-sm font-semibold">{b.rotulo}</span>
                </li>
              );
            })}
          </ul>
        </Revelar>

        <Revelar delay={0.2}>
          <p className="mx-auto mt-8 max-w-md text-base leading-relaxed text-white/70">
            Você não precisa evoluir sozinho. Vem treinar com a gente!
          </p>
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex h-12 items-center justify-center gap-2.5 rounded-xl bg-[#0090D8] px-7 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,144,216,0.45)] transition-all hover:-translate-y-0.5 hover:bg-[#00A8E4] active:translate-y-0"
          >
            <IconeWhatsApp className="size-4.5" />
            Venha treinar conosco
          </a>
        </Revelar>
      </div>
    </section>
  );
}
