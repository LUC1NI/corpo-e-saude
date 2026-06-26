"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { removerPresenca } from "@/lib/acoes-presenca";

export function RemoverPresencaButton({ id }: { id: string }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);

  async function remover() {
    setCarregando(true);
    const res = await removerPresenca(id);
    setCarregando(false);
    if (res.ok) {
      toast.success("Presença removida.");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <button
      type="button"
      aria-label="Remover presença"
      onClick={remover}
      disabled={carregando}
      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}
