"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { excluirAvaliacao } from "@/lib/acoes-acompanhamento";

export function ExcluirAvaliacaoButton({
  id,
  alunoId,
}: {
  id: string;
  alunoId: string;
}) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);

  async function excluir() {
    setCarregando(true);
    const res = await excluirAvaliacao(id, alunoId);
    setCarregando(false);
    if (res.ok) {
      toast.success("Avaliação excluída.");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <button
      type="button"
      aria-label="Excluir avaliação"
      onClick={excluir}
      disabled={carregando}
      className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground sm:size-7 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
    >
      {carregando ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Trash2 className="size-3.5" />
      )}
    </button>
  );
}
