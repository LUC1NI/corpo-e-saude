"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { gerarCobrancasPendentes } from "@/lib/acoes-financeiro";

export function GerarCobrancasButton() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);

  async function gerar() {
    setCarregando(true);
    const res = await gerarCobrancasPendentes();
    setCarregando(false);
    if (res.ok) {
      const n = res.dados?.geradas ?? 0;
      toast.success(
        n > 0
          ? `${n} cobrança(s) gerada(s).`
          : "Nenhuma cobrança pendente para gerar.",
      );
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={gerar}
      loading={carregando}
    >
      <RefreshCw className="size-4" />
      {carregando ? "Gerando…" : "Gerar cobranças"}
    </Button>
  );
}
