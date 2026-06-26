import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Marca do studio: logo + nome. `variante` ajusta as cores do texto
 * para fundo navy (sidebar) ou claro.
 */
export function LogoMarca({
  variante = "claro",
  className,
}: {
  variante?: "navy" | "claro";
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
        <Image
          src="/icons/icon-192.png"
          alt="Corpo & Saúde"
          width={32}
          height={32}
        />
      </div>
      <div className="leading-tight">
        <p
          className={cn(
            "text-sm font-bold",
            variante === "navy" ? "text-white" : "text-foreground",
          )}
        >
          Corpo &amp; Saúde
        </p>
        <p
          className={cn(
            "text-[10px] font-medium tracking-wider uppercase",
            variante === "navy" ? "text-white/60" : "text-muted-foreground",
          )}
        >
          Personal Studio
        </p>
      </div>
    </div>
  );
}
