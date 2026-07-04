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
import { excluirHorarioAdmin } from "@/lib/acoes-presenca";

export function ExcluirHorarioAdmin({
  id,
  rotulo,
}: {
  id: string;
  rotulo: string;
}) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);

  async function excluir() {
    setCarregando(true);
    const res = await excluirHorarioAdmin(id);
    setCarregando(false);
    if (res.ok) {
      toast.success("Horário removido.");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        aria-label="Remover horário"
        disabled={carregando}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
      >
        <Trash2 className="size-3.5" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover horário {rotulo}?</AlertDialogTitle>
          <AlertDialogDescription>
            O horário sai da grade do professor. Os alunos agendados nele
            deixam de aparecer na presença desse horário. Esta ação não pode
            ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={carregando}>Voltar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            loading={carregando}
            onClick={excluir}
          >
            {carregando ? "Removendo…" : "Remover"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
