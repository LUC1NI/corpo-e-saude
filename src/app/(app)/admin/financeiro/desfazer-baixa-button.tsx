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
export function DesfazerBaixaButton({
  pagamentoId,
  descricao,
  compacto = false,
}: {
  pagamentoId: string;
  descricao: string;
  /** Só o ícone (linha da ficha do aluno: cabe na mesma linha no celular). */
  compacto?: boolean;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  return (
    <AlertDialog>
      {compacto ? (
        <AlertDialogTrigger aria-label="Desfazer recebimento" title="Desfazer recebimento" className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "text-muted-foreground")}>
          <Undo2 className="size-4" />
        </AlertDialogTrigger>
      ) : (
        <AlertDialogTrigger className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "min-h-11 text-muted-foreground sm:min-h-8")}>
          <Undo2 className="size-4" />
          Desfazer
        </AlertDialogTrigger>
      )}
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
