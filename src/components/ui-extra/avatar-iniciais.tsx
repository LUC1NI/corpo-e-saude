import { iniciais } from "@/lib/formato";
import { cn } from "@/lib/utils";

const TAMANHOS = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
} as const;

/**
 * Avatar circular com as iniciais do nome. Cor de fundo determinística
 * (derivada do nome) dentro da paleta da marca.
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
  const cores = [
    "bg-[#0090D8]",
    "bg-brand-navy",
    "bg-[#00A8E4]",
    "bg-[#0a3f86]",
  ];
  let soma = 0;
  for (const ch of nome) soma += ch.charCodeAt(0);
  const cor = cores[soma % cores.length];

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        TAMANHOS[tamanho],
        cor,
        className,
      )}
    >
      {iniciais(nome)}
    </span>
  );
}
