"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { marcarPagamentoPago } from "@/lib/acoes-financeiro";

export function BaixaButton({ pagamentoId }: { pagamentoId: string }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);

  async function baixar() {
    setCarregando(true);
    const res = await marcarPagamentoPago(pagamentoId);
    setCarregando(false);
    if (res.ok) {
      toast.success("Baixa registrada.");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <Button type="button" size="sm" onClick={baixar} disabled={carregando}>
      {carregando ? "…" : "Dar baixa"}
    </Button>
  );
}
