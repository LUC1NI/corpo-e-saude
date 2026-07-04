"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { excluirDespesa } from "@/lib/acoes-financeiro";

export function ExcluirDespesaButton({ id }: { id: string }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);

  async function excluir() {
    setCarregando(true);
    const res = await excluirDespesa(id);
    setCarregando(false);
    if (res.ok) {
      toast.success("Despesa excluída.");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <button
      type="button"
      aria-label="Excluir despesa"
      onClick={excluir}
      disabled={carregando}
      className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
    >
      {carregando ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Trash2 className="size-4" />
      )}
    </button>
  );
}
