import type { MetadataRoute } from "next";

import { urlAbsoluta } from "@/lib/site";

/** Só as páginas públicas: a landing e a entrada do sistema. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: urlAbsoluta("/"), changeFrequency: "monthly", priority: 1 },
    { url: urlAbsoluta("/login"), changeFrequency: "yearly", priority: 0.5 },
  ];
}
