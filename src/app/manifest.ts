import type { MetadataRoute } from "next";

/**
 * Manifest do PWA — gerado em /manifest.webmanifest.
 * Modo standalone (aparência de app), paleta da marca e ícones do logo.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Corpo & Saúde — Personal Trainer Studio",
    short_name: "Corpo & Saúde",
    description:
      "Gestão de alunos, treinos, presença, finanças e avaliação física do Corpo & Saúde.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#033373",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["health", "fitness", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
