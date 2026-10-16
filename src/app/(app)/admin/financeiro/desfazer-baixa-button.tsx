"use client";

import { Undo2 } from "lucide-react";
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
import { buttonVariants } from "@/components/ui/button";
import { comRede } from "@/lib/acoes";
import { desfazerBaixa } from "@/lib/acoes-financeiro";
import { cn } from "@/lib/utils";

/** Desfaz um "Recebi" a qualquer momento (o aviso de 8 s não é o único caminho). */
export function DesfazerBaixaButton({ pagamentoId, descricao }: { pagamentoId: string; descricao: string }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  return (
    <AlertDialog>
      <AlertDialogTrigger className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "min-h-11 text-muted-foreground sm:min-h-8")}>
        <Undo2 className="size-4" />
        Desfazer
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desfazer o recebimento?</AlertDialogTitle>
          <AlertDialogDescription>{descricao} volta a ficar em aberto.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Manter pago</AlertDialogCancel>
          <AlertDialogAction
            disabled={ocupado}
            onClick={async () => {
              setOcupado(true);
              const res = await comRede(desfazerBaixa(pagamentoId));
              setOcupado(false);
              if (!res.ok) {
                toast.error(res.erro);
                return;
              }
              toast.success("Recebimento desfeito.");
              router.refresh();
            }}
          >
            Desfazer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
