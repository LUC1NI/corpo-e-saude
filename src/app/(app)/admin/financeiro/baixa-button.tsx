"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { marcarPagamentoPago } from "@/lib/acoes-financeiro";
import { cn } from "@/lib/utils";

const FORMAS = ["Pix", "Dinheiro", "Cartão", "Transferência"];

export function BaixaButton({ pagamentoId }: { pagamentoId: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  // Qual botão disparou a baixa (para o spinner aparecer só nele).
  const [formaEmCurso, setFormaEmCurso] = useState<string | null>(null);

  async function baixar(forma?: string) {
    setCarregando(true);
    setFormaEmCurso(forma ?? "__sem__");
    const res = await marcarPagamentoPago(pagamentoId, forma);
    setCarregando(false);
    setFormaEmCurso(null);
    if (res.ok) {
      setAberto(false);
      toast.success("Pagamento confirmado.");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
        <Check className="size-4" />
        Confirmar
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirmar pagamento</DialogTitle>
          <DialogDescription>
            Registra o recebimento da mensalidade. Escolha a forma de pagamento.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {FORMAS.map((forma) => (
            <Button
              key={forma}
              type="button"
              variant="outline"
              disabled={carregando}
              loading={formaEmCurso === forma}
              onClick={() => baixar(forma)}
            >
              {forma}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          disabled={carregando}
          loading={formaEmCurso === "__sem__"}
          onClick={() => baixar()}
          className="w-full"
        >
          Confirmar sem informar a forma
        </Button>
      </DialogContent>
    </Dialog>
  );
}
