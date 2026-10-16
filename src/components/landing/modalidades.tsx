import { Check, MapPin, Wifi } from "lucide-react";

import { WHATSAPP_PRINCIPAL } from "@/components/landing/dados";
import { IconeWhatsApp } from "@/components/landing/icone-whatsapp";
import { Revelar } from "@/components/landing/revelar";

function linkWhatsApp(mensagem: string) {
  return `https://wa.me/${WHATSAPP_PRINCIPAL}?text=${encodeURIComponent(mensagem)}`;
}

const MODALIDADES = [
  {
    icone: MapPin,
    selo: "No estúdio · Mafra/SC",
    titulo: "Treino presencial",
    destaque: true,
    descricao:
      "A experiência completa: você treina com hora marcada e o personal do seu lado, do aquecimento ao alongamento.",
    itens: [
      "Personal acompanhando cada série e corrigindo a execução",
      "Estúdio reservado, sem lotação de academia convencional",
      "Equipamentos completos para força, hipertrofia e condicionamento",
      "Avaliações físicas periódicas para medir sua evolução",
    ],
    cta: "Agendar aula experimental",
    mensagem:
      "Olá! Vim pelo site do Corpo & Saúde e quero agendar uma aula experimental presencial.",
  },
  {
    icone: Wifi,
    selo: "Onde você estiver",
    titulo: "Consultoria online",
    destaque: false,
    descricao:
      "Para quem tem rotina apertada ou mora longe: o mesmo cuidado do presencial, com treino sob medida direto no seu celular.",
    itens: [
      "Treino montado a partir da sua anamnese e objetivo",
      "Fichas de treino organizadas por divisões no aplicativo",
      "Ajustes constantes conforme seu progresso",
      "Contato direto com o personal para tirar dúvidas",
    ],
    cta: "Saber mais sobre o online",
    mensagem:
      "Olá! Vim pelo site do Corpo & Saúde e quero saber mais sobre a consultoria online.",
  },
];

/** Presencial × online: os dois formatos de atendimento lado a lado. */
export function Modalidades() {
  return (
    <section id="modalidades" className="scroll-mt-24 bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 lg:px-8 lg:py-28">
        <Revelar className="text-center">
          <p className="text-xs font-bold tracking-widest text-[#0090D8] uppercase">
            Modalidades
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#18181A] sm:text-4xl">
            Presencial ou online,{" "}
            <span className="bg-gradient-to-r from-[#0090D8] to-[#033373] bg-clip-text text-transparent">
              você escolhe
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#5a6b80]">
            O acompanhamento é o mesmo nos dois formatos: treino individual,
            feito para o seu corpo e a sua rotina.
          </p>
        </Revelar>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {MODALIDADES.map((m, i) => {
            const Icone = m.icone;
            const escuro = m.destaque;
            return (
              <Revelar key={m.titulo} delay={i * 0.12} className="h-full">
                <article
                  className={
                    escuro
                      ? "relative flex h-full flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-[#022a5e] via-[#033373] to-[#0353a8] p-8 text-white shadow-xl ring-1 ring-white/10 transition-all hover:-translate-y-1 hover:shadow-2xl lg:p-10"
                      : "flex h-full flex-col rounded-3xl bg-[#F4F7FB] p-8 ring-1 ring-black/5 transition-all hover:-translate-y-1 hover:shadow-lg hover:ring-[#0090D8]/20 lg:p-10"
                  }
                >
                  {escuro && (
                    <>
                      <div
                        aria-hidden
                        className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-[#0090D8]/30 blur-3xl"
                      />
                      <span className="absolute top-5 right-5 rounded-full bg-gradient-to-r from-cta-de to-cta-ate px-3 py-1 text-[10px] font-bold tracking-widest text-white uppercase shadow-lg">
                        Mais procurado
                      </span>
                    </>
                  )}

                  <div className="relative flex items-center gap-4">
                    <span
                      className={
                        escuro
                          ? "flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#7dd3fc] shadow-md ring-1 ring-white/15"
                          : "flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#033373] to-[#0090D8] text-white shadow-md"
                      }
                    >
                      <Icone className="size-5.5" />
                    </span>
                    <span>
                      <span
                        className={
                          escuro
                            ? "block text-[11px] font-semibold tracking-widest text-[#7dd3fc] uppercase"
                            : "block text-[11px] font-semibold tracking-widest text-[#0090D8] uppercase"
                        }
                      >
                        {m.selo}
                      </span>
                      <h3
                        className={
                          escuro
                            ? "text-xl font-extrabold tracking-tight text-white"
                            : "text-xl font-extrabold tracking-tight text-[#18181A]"
                        }
                      >
                        {m.titulo}
                      </h3>
                    </span>
                  </div>

                  <p
                    className={
                      escuro
                        ? "relative mt-4 text-sm leading-relaxed text-white/75"
                        : "mt-4 text-sm leading-relaxed text-[#5a6b80]"
                    }
                  >
                    {m.descricao}
                  </p>

                  <ul className="relative mt-6 flex-1 space-y-3">
                    {m.itens.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <span
                          className={
                            escuro
                              ? "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#00A8E4]/25 text-[#7dd3fc]"
                              : "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#0090D8]/10 text-[#0090D8]"
                          }
                        >
                          <Check className="size-3" strokeWidth={3} />
                        </span>
                        <span
                          className={
                            escuro
                              ? "text-sm leading-relaxed text-white/85"
                              : "text-sm leading-relaxed text-[#18181A]/80"
                          }
                        >
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <a
                    href={linkWhatsApp(m.mensagem)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={
                      escuro
                        ? "relative mt-8 inline-flex h-11 items-center justify-center gap-2.5 self-start rounded-xl bg-gradient-to-r from-cta-de to-cta-ate px-5 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(0,168,228,0.5)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(0,168,228,0.6)] active:translate-y-0"
                        : "mt-8 inline-flex h-11 items-center justify-center gap-2.5 self-start rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(0,144,216,0.35)] transition-all hover:-translate-y-0.5 hover:bg-[#00A8E4] active:translate-y-0"
                    }
                  >
                    <IconeWhatsApp className="size-4" />
                    {m.cta}
                  </a>
                </article>
              </Revelar>
            );
          })}
        </div>
      </div>
    </section>
  );
}
