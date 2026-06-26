"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { excluirHorario } from "@/lib/acoes-presenca";

export function ExcluirHorarioButton({ id }: { id: string }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);

  async function excluir() {
    setCarregando(true);
    const res = await excluirHorario(id);
    setCarregando(false);
    if (res.ok) {
      toast.success("Horário removido.");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <button
      type="button"
      aria-label="Excluir horário"
      onClick={excluir}
      disabled={carregando}
      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}
