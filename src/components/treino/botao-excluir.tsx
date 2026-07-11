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
import { Button } from "@/components/ui/button";
import type { ResultadoAcao } from "@/lib/acoes";

/**
 * Botão de lixeira com confirmação. Reutilizado nos itens de treino
 * (ficha, divisão, exercício e biblioteca).
 */
export function BotaoExcluir({
  onConfirm,
  titulo,
  descricao,
  sucessoMsg = "Excluído.",
  rotulo = "Excluir",
  redirecionarPara,
}: {
  onConfirm: () => Promise<ResultadoAcao>;
  titulo: string;
  descricao: string;
  sucessoMsg?: string;
  rotulo?: string;
  /**
   * Se o item excluído for o próprio conteúdo da página (ex.: excluir um
   * treino-modelo estando dentro dele), navega para esta rota em vez de dar
   * refresh — que recarregaria um recurso já apagado e cairia num 404.
   */
  redirecionarPara?: string;
}) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [aberto, setAberto] = useState(false);

  async function excluir() {
    setCarregando(true);
    const res = await onConfirm();
    if (res.ok) {
      toast.success(sucessoMsg);
      setAberto(false);
      if (redirecionarPara) {
        router.push(redirecionarPara);
      } else {
        setCarregando(false);
      }
      router.refresh();
    } else {
      setCarregando(false);
      toast.error(res.erro);
    }
  }

  return (
    <AlertDialog open={aberto} onOpenChange={setAberto}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={rotulo}
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          />
        }
      >
        <Trash2 className="size-3.5" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={carregando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            loading={carregando}
            onClick={(e) => {
              e.preventDefault();
              void excluir();
            }}
          >
            {carregando ? "Excluindo…" : rotulo}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
