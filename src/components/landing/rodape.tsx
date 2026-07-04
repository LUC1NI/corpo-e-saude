import { MapPin } from "lucide-react";
import Image from "next/image";

import { IconeInstagram } from "@/components/landing/icone-instagram";
import {
  ENDERECO,
  INSTAGRAM,
  NAV_LINKS,
  TELEFONES,
  WHATSAPP_LINK,
} from "@/components/landing/dados";
import { IconeWhatsApp } from "@/components/landing/icone-whatsapp";
import { Revelar } from "@/components/landing/revelar";
import Link from "@/components/ui-extra/link";

/** Faixa de CTA final + contato + rodapé navy. */
export function Rodape() {
  return (
    <footer className="bg-[#033373] text-white">
      <div className="mx-auto w-full max-w-6xl px-4 pt-16 pb-10 lg:px-8 lg:pt-20">
        {/* CTA final */}
        <Revelar>
          <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-white/5 p-8 ring-1 ring-white/10 sm:flex-row sm:items-center lg:p-10">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Pronto para começar?
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
                Chama a gente no WhatsApp e agende uma aula experimental, sem
                compromisso.
              </p>
            </div>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2.5 rounded-xl bg-[#0090D8] px-6 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,144,216,0.45)] transition-all hover:-translate-y-0.5 hover:bg-[#00A8E4] active:translate-y-0"
            >
              <IconeWhatsApp className="size-4.5" />
              Falar no WhatsApp
            </a>
          </div>
        </Revelar>

        {/* Contato + endereço */}
        <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
                <Image
                  src="/icons/icon-192.png"
                  alt="Logo Corpo & Saúde"
                  width={32}
                  height={32}
                />
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-bold">
                  Corpo &amp; Saúde
                </span>
                <span className="block text-[10px] font-medium tracking-wider text-white/60 uppercase">
                  Personal Trainer Studio
                </span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
              Personal Trainer Studio. Treino presencial e online com
              acompanhamento profissional.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold tracking-widest text-white/50 uppercase">
              Contato
            </h3>
            <ul className="mt-4 space-y-2.5">
              {TELEFONES.map((t) => (
                <li key={t.numero}>
                  <a
                    href={`https://wa.me/${t.numero}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 text-sm text-white/80 transition-colors hover:text-white"
                  >
                    <IconeWhatsApp className="size-4 text-[#00A8E4]" />
                    {t.rotulo}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href={INSTAGRAM.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-sm text-white/80 transition-colors hover:text-white"
                >
                  <IconeInstagram className="size-4 text-[#00A8E4]" />
                  {INSTAGRAM.usuario}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold tracking-widest text-white/50 uppercase">
              Endereço
            </h3>
            <a
              href={ENDERECO.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-start gap-2.5 text-sm leading-relaxed text-white/80 transition-colors hover:text-white"
            >
              <MapPin className="mt-0.5 size-4 shrink-0 text-[#00A8E4]" />
              <span>
                {ENDERECO.linha1}
                <br />
                {ENDERECO.linha2}
              </span>
            </a>
          </div>
        </div>

        {/* Barra final */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-white/50">
            © {new Date().getFullYear()}{" "}Corpo &amp; Saúde Personal
            Trainer Studio. Todos os direitos reservados.
          </p>
          <nav className="flex flex-wrap items-center gap-5">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-xs text-white/50 transition-colors hover:text-white"
              >
                {l.rotulo}
              </a>
            ))}
            <Link
              href="/login"
              className="text-xs font-semibold text-[#00A8E4] transition-colors hover:text-white"
            >
              Entrar no sistema
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
