"use client";

import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { alternarPresenca } from "@/lib/acoes-presenca";
import { cn } from "@/lib/utils";

export function PresencaToggle({
  alunoId,
  data,
  hora,
  presente,
  professorId = null,
}: {
  alunoId: string;
  data: string;
  hora: string | null;
  presente: boolean;
  /** Admin informa o professor da aula; professor deixa null (usa a própria). */
  professorId?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Estado otimista: reflete o clique NA HORA, sem esperar o servidor.
  const [otimista, setOtimista] = useState<boolean | null>(null);
  // Quando os dados reais chegam (a prop `presente` muda), descarta o otimista
  // — ajuste durante o render (padrão do React), sem useEffect em cascata.
  const [propAnterior, setPropAnterior] = useState(presente);
  if (propAnterior !== presente) {
    setPropAnterior(presente);
    setOtimista(null);
  }
  const presenteAgora = otimista ?? presente;

  async function alternar() {
    const novo = !presenteAgora;
    setOtimista(novo); // feedback imediato
    const res = await alternarPresenca(alunoId, data, hora, professorId);
    if (!res.ok) {
      setOtimista(null);
      toast.error(res.erro);
      return;
    }
    // Mantém o spinner até a tela recarregar com o dado confirmado.
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={pending}
      aria-pressed={presenteAgora}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-progress",
        presenteAgora
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "bg-background text-muted-foreground hover:bg-muted",
      )}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Check
          className={cn("size-4", presenteAgora ? "opacity-100" : "opacity-30")}
        />
      )}
      {presenteAgora ? "Presente" : "Marcar"}
    </button>
  );
}
