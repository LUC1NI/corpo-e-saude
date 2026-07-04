import { WHATSAPP_LINK } from "@/components/landing/dados";
import { IconeWhatsApp } from "@/components/landing/icone-whatsapp";

/**
 * Botão de WhatsApp fixo no canto inferior direito — atalho de contato
 * sempre visível enquanto a pessoa navega pela landing.
 */
export function WhatsAppFlutuante() {
  return (
    <a
      href={WHATSAPP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com o Corpo & Saúde no WhatsApp"
      className="fixed right-4 bottom-4 z-40 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_24px_rgba(37,211,102,0.5)] transition-transform hover:scale-110 active:scale-95 sm:right-6 sm:bottom-6"
    >
      <IconeWhatsApp className="size-7" />
      {/* Pulso sutil chamando atenção para o botão */}
      <span
        aria-hidden
        className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366]/40 [animation-duration:2.5s]"
      />
    </a>
  );
}
