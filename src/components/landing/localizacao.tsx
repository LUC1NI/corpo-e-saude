import { Clock, MapPin, Navigation } from "lucide-react";

import { ENDERECO, TELEFONES } from "@/components/landing/dados";
import { IconeWhatsApp } from "@/components/landing/icone-whatsapp";
import { Revelar } from "@/components/landing/revelar";

const MAPA_EMBED_URL =
  "https://www.google.com/maps?q=" +
  encodeURIComponent("Rua Alípio Siqueira, 221, Bairro do Passo, Mafra SC") +
  "&output=embed";

/** Localização do estúdio: mapa interativo + endereço, contatos e horários. */
export function Localizacao() {
  return (
    <section id="contato" className="scroll-mt-24 bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 lg:px-8 lg:py-28">
        <Revelar className="text-center">
          <p className="text-xs font-bold tracking-widest text-[#0090D8] uppercase">
            Onde estamos
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#18181A] sm:text-4xl">
            Venha nos visitar
          </h2>
        </Revelar>

        <div className="mt-12 grid gap-6 lg:grid-cols-5">
          {/* Mapa */}
          <Revelar className="lg:col-span-3">
            <div className="h-full overflow-hidden rounded-3xl shadow-lg ring-1 ring-black/5">
              <iframe
                src={MAPA_EMBED_URL}
                title="Mapa com a localização do Corpo & Saúde em Mafra/SC"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                className="h-full min-h-[320px] w-full border-0 sm:min-h-[380px]"
              />
            </div>
          </Revelar>

          {/* Informações */}
          <Revelar delay={0.12} className="lg:col-span-2">
            <div className="flex h-full flex-col gap-4">
              <div className="rounded-3xl bg-[#F4F7FB] p-7 ring-1 ring-black/5">
                <span className="flex size-11 items-center justify-center rounded-xl bg-[#033373] text-white shadow-md">
                  <MapPin className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-bold text-[#18181A]">
                  Endereço
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#5a6b80]">
                  {ENDERECO.linha1}
                  <br />
                  {ENDERECO.linha2}
                </p>
                <a
                  href={ENDERECO.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0090D8] transition-colors hover:text-[#033373]"
                >
                  <Navigation className="size-4" />
                  Traçar rota no Google Maps
                </a>
              </div>

              <div className="rounded-3xl bg-[#F4F7FB] p-7 ring-1 ring-black/5">
                <span className="flex size-11 items-center justify-center rounded-xl bg-[#033373] text-white shadow-md">
                  <Clock className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-bold text-[#18181A]">
                  Atendimento com hora marcada
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#5a6b80]">
                  Horários de manhã, tarde e noite. Consulte a disponibilidade:
                </p>
                <ul className="mt-4 space-y-2.5">
                  {TELEFONES.map((t) => (
                    <li key={t.numero}>
                      <a
                        href={`https://wa.me/${t.numero}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2.5 text-sm font-semibold text-[#18181A] transition-colors hover:text-[#0090D8]"
                      >
                        <IconeWhatsApp className="size-4 text-[#25D366]" />
                        {t.rotulo}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Revelar>
        </div>
      </div>
    </section>
  );
}
