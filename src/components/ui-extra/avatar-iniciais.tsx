import { iniciais } from "@/lib/formato";
import { cn } from "@/lib/utils";

const TAMANHOS = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
} as const;

/**
 * Avatar circular com as iniciais do nome. Cor determinística (derivada do nome)
 * numa paleta clara, com as iniciais em tom escuro (contraste AA).
 */
export function AvatarIniciais({
  nome,
  tamanho = "md",
  className,
}: {
  nome: string;
  tamanho?: keyof typeof TAMANHOS;
  className?: string;
}) {
  // Tons claros com iniciais em navy: legível e sem competir com os botões.
  const cores = [
    "bg-[#E6F5FC] text-brand-navy",
    "bg-[#E8EEF8] text-brand-navy",
    "bg-[#E8F7EF] text-[#15603A]",
    "bg-[#FFF3E0] text-[#8A4B08]",
    "bg-[#F1ECFB] text-[#4B2E83]",
    "bg-[#FDECEC] text-[#8E1F1F]",
  ];
  let soma = 0;
  for (const ch of nome) soma += ch.charCodeAt(0);
  const cor = cores[soma % cores.length];

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        TAMANHOS[tamanho],
        cor,
        className,
      )}
    >
      {iniciais(nome)}
    </span>
  );
}
