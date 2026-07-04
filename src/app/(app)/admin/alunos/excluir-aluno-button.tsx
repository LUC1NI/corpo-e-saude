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

import { excluirAluno } from "./actions";

export function ExcluirAlunoButton({
  alunoId,
  nome,
}: {
  alunoId: string;
  nome: string;
}) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);

  async function excluir() {
    setCarregando(true);
    const res = await excluirAluno(alunoId);
    if (res.ok) {
      toast.success("Aluno excluído.");
      router.push("/admin/alunos");
      router.refresh();
    } else {
      setCarregando(false);
      toast.error(res.erro);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button type="button" variant="destructive" />}
        disabled={carregando}
      >
        <Trash2 className="size-4" />
        Excluir aluno
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir {nome}?</AlertDialogTitle>
          <AlertDialogDescription>
            Isto remove permanentemente o aluno e todo o histórico vinculado:
            matrículas, pagamentos, presenças, anamnese, avaliações físicas e
            fichas de treino. Se houver acesso criado, a conta do aluno também
            é removida. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={carregando}>Voltar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            loading={carregando}
            onClick={excluir}
          >
            {carregando ? "Excluindo…" : "Sim, excluir aluno"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
