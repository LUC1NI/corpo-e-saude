"use client";

import { Film } from "lucide-react";
import { useState } from "react";

/**
 * Miniatura da mídia de um exercício (imagem/GIF de demonstração). Abre a
 * mídia em nova aba. A URL é fornecida pelo professor (externa), por isso
 * usamos <img> simples em vez de next/image. Se a imagem falhar, mostra um
 * link discreto "ver".
 */
export function MidiaThumb({
  url,
  nome,
  tamanho = "md",
}: {
  url: string | null | undefined;
  nome: string;
  tamanho?: "sm" | "md";
}) {
  const [erro, setErro] = useState(false);
  // Defesa em profundidade: só renderiza link http(s), mesmo que uma URL
  // antiga no banco tenha escapado da validação do schema.
  if (!url || !/^https?:\/\//i.test(url)) return null;

  const px = tamanho === "sm" ? "size-9" : "size-14";

  if (erro) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        <Film className="size-3.5" />
        ver
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title={`Ver demonstração: ${nome}`}
      className={`block ${px} shrink-0 overflow-hidden rounded-md border bg-muted`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={nome}
        loading="lazy"
        onError={() => setErro(true)}
        className="size-full object-cover"
      />
    </a>
  );
}
