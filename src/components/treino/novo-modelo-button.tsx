"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CampoForm } from "@/components/ui-extra/campo-form";
import { criarModeloTreino } from "@/lib/acoes-treino";

/**
 * Cria um treino-modelo (reutilizável) e abre a página dele para montar as
 * divisões e exercícios. `basePath` = "/professor/treinos" ou "/admin/treinos".
 */
export function NovoModeloButton({ basePath }: { basePath: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [nome, setNome] = useState("");
  const [objetivo, setObjetivo] = useState("");

  async function criar() {
    if (nome.trim().length < 2) {
      toast.error("Informe o nome do treino.");
      return;
    }
    setCarregando(true);
    const res = await criarModeloTreino({
      nome: nome.trim(),
      objetivo: objetivo.trim() || undefined,
      ativo: true,
    });
    if (res.ok && res.dados) {
      toast.success("Treino criado. Agora monte os dias e exercícios.");
      router.push(`${basePath}/${res.dados.id}`);
      router.refresh();
    } else {
      setCarregando(false);
      if (!res.ok) toast.error(res.erro);
    }
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        setAberto(v);
        if (!v) {
          setNome("");
          setObjetivo("");
        }
      }}
    >
      <DialogTrigger
        render={
          <Button>
            <Plus className="size-4" />
            Novo treino
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Novo treino</DialogTitle>
          <DialogDescription>
            Treino reutilizável: monte uma vez, aplique a qualquer aluno e
            ajuste na ficha dele.
          </DialogDescription>
        </DialogHeader>

        <form
          id="form-novo-modelo"
          onSubmit={(e) => {
            e.preventDefault();
            void criar();
          }}
          className="space-y-4"
        >
          <CampoForm label="Nome" htmlFor="modelo-nome" obrigatorio>
            <Input
              id="modelo-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Hipertrofia ABC — iniciante"
            />
          </CampoForm>
          <CampoForm label="Objetivo" htmlFor="modelo-objetivo">
            <Textarea
              id="modelo-objetivo"
              rows={2}
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              placeholder="Foco do treino (opcional)"
            />
          </CampoForm>
        </form>

        <DialogFooter>
          <DialogClose
            render={<Button type="button" variant="outline" />}
            disabled={carregando}
          >
            Cancelar
          </DialogClose>
          <Button type="submit" form="form-novo-modelo" loading={carregando}>
            {carregando ? "Criando…" : "Criar e montar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
