"use client";

import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { alternarPresenca } from "@/lib/acoes-presenca";
import { cn } from "@/lib/utils";

export function PresencaToggle({
  alunoId,
  data,
  hora,
  presente,
}: {
  alunoId: string;
  data: string;
  hora: string | null;
  presente: boolean;
}) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);

  async function alternar() {
    setCarregando(true);
    const res = await alternarPresenca(alunoId, data, hora);
    setCarregando(false);
    if (res.ok) {
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={carregando}
      aria-pressed={presente}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50",
        presente
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "bg-background text-muted-foreground hover:bg-muted",
      )}
    >
      {carregando ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Check
          className={cn("size-4", presente ? "opacity-100" : "opacity-30")}
        />
      )}
      {presente ? "Presente" : "Marcar"}
    </button>
  );
}
