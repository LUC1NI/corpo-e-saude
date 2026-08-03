import type { Metadata } from "next";

import { Beneficios } from "@/components/landing/beneficios";
import { ComoFunciona } from "@/components/landing/como-funciona";
import { ENDERECO, INSTAGRAM, TELEFONES } from "@/components/landing/dados";
import { Depoimentos } from "@/components/landing/depoimentos";
import { Diferenciais } from "@/components/landing/diferenciais";
import { Faq, PERGUNTAS } from "@/components/landing/faq";
import { Hero } from "@/components/landing/hero";
import { LandingHeader } from "@/components/landing/landing-header";
import { Localizacao } from "@/components/landing/localizacao";
import { Modalidades } from "@/components/landing/modalidades";
import { Rodape } from "@/components/landing/rodape";
import { Sobre } from "@/components/landing/sobre";
import { WhatsAppFlutuante } from "@/components/landing/whatsapp-flutuante";

// Landing 100% estática: é pré-renderizada no build e servida do cache da
// borda (Cloudflare), sem rodar o Worker/SSR a cada acesso. Assim um flood
// na página pública bate no cache, não na sua cota de compute nem no banco.
export const dynamic = "force-static";

const TITULO = "Corpo & Saúde | Personal Trainer Studio em Mafra/SC";
const DESCRICAO =
  "Estúdio de personal trainer em Mafra/SC. Treino personalizado presencial e online, avaliação física completa e acompanhamento de perto. Agende sua aula experimental pelo WhatsApp.";

export const metadata: Metadata = {
  title: { absolute: TITULO },
  description: DESCRICAO,
  keywords: [
    "personal trainer Mafra",
    "estúdio de personal Mafra SC",
    "treino personalizado",
    "academia Mafra",
    "consultoria online de treino",
    "avaliação física",
  ],
  openGraph: {
    title: TITULO,
    description: DESCRICAO,
    type: "website",
    locale: "pt_BR",
    siteName: "Corpo & Saúde",
    images: [{ url: "/logo.jpg", alt: "Logo Corpo & Saúde" }],
  },
};

/* Dados estruturados (schema.org) para busca local e rich results:
   o estúdio como ExerciseGym + as perguntas frequentes como FAQPage. */
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ExerciseGym",
      name: "Corpo & Saúde Personal Trainer Studio",
      description: DESCRICAO,
      image: "/logo.jpg",
      sameAs: [INSTAGRAM.url],
      telephone: `+${TELEFONES[0].numero}`,
      address: {
        "@type": "PostalAddress",
        streetAddress: ENDERECO.linha1,
        addressLocality: "Mafra",
        addressRegion: "SC",
        addressCountry: "BR",
      },
      priceRange: "$$",
    },
    {
      "@type": "FAQPage",
      mainEntity: PERGUNTAS.map((p) => ({
        "@type": "Question",
        name: p.pergunta,
        acceptedAnswer: { "@type": "Answer", text: p.resposta },
      })),
    },
  ],
};

/**
 * Landing institucional pública (rota /). Estática — o login do sistema
 * fica em /login (botão "Acessar sistema" no header, no hero e no rodapé).
 */
export default function LandingPage() {
  return (
    <div className="bg-white">
      <script
        type="application/ld+json"
        // Escapa `<` para que nenhum texto (ex.: uma resposta de FAQ futura)
        // consiga fechar a tag <script> e injetar HTML no JSON-LD.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(JSON_LD).replace(/</g, "\\u003c"),
        }}
      />
      <LandingHeader />
      <main>
        <Hero />
        <Sobre />
        <ComoFunciona />
        <Modalidades />
        <Diferenciais />
        <Beneficios />
        <Depoimentos />
        <Faq />
        <Localizacao />
      </main>
      <Rodape />
      <WhatsAppFlutuante />
    </div>
  );
}
