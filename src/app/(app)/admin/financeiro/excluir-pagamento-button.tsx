"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { excluirPagamento } from "@/lib/acoes-financeiro";

export function ExcluirPagamentoButton({
  pagamentoId,
}: {
  pagamentoId: string;
}) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);

  async function excluir() {
    setCarregando(true);
    const res = await excluirPagamento(pagamentoId);
    setCarregando(false);
    if (res.ok) {
      toast.success("Cobrança excluída.");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        aria-label="Excluir mensalidade"
        disabled={carregando}
        className="inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 sm:size-8 hover:text-destructive disabled:opacity-50"
      >
        <Trash2 className="size-4" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir esta cobrança?</AlertDialogTitle>
          <AlertDialogDescription>
            A mensalidade em aberto será removida permanentemente. Use isto para
            apagar uma cobrança duplicada ou lançada por engano. Esta ação não
            pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={carregando}>Voltar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            loading={carregando}
            onClick={excluir}
          >
            {carregando ? "Excluindo…" : "Sim, excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
