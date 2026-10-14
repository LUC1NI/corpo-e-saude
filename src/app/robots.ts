import type { MetadataRoute } from "next";

import { urlAbsoluta } from "@/lib/site";

/** Landing e login indexáveis; área logada e rotas técnicas fora do Google. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/professor",
        "/aluno",
        "/api/",
        "/auth/",
        "/redefinir-senha",
      ],
    },
    sitemap: urlAbsoluta("/sitemap.xml"),
  };
}
