"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { AvatarIniciais } from "@/components/ui-extra/avatar-iniciais";
import { definirAlunosDoHorario, excluirHorario } from "@/lib/acoes-presenca";
import { cn } from "@/lib/utils";

export function GerenciarAula({
  horarioId,
  rotulo,
  alunos,
  atribuidos,
  capacidade,
  permitirRemover = true,
}: {
  horarioId: string;
  rotulo: string;
  alunos: { id: string; nome: string }[];
  atribuidos: string[];
  capacidade: number | null;
  /** Mostra o botão "Remover horário" (só na tela de Horários). */
  permitirRemover?: boolean;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(
    new Set(atribuidos),
  );

  const n = atribuidos.length;
  const cheio = capacidade != null && n >= capacidade;
  const livre = n === 0;

  function alternar(id: string, marcado: boolean) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (marcado) novo.add(id);
      else novo.delete(id);
      return novo;
    });
  }

  async function salvar() {
    setCarregando(true);
    const res = await definirAlunosDoHorario(horarioId, [...selecionados]);
    setCarregando(false);
    if (res.ok) {
      setAberto(false);
      toast.success("Alunos da aula atualizados.");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  async function remover() {
    if (!confirmando) {
      setConfirmando(true);
      return;
    }
    setCarregando(true);
    const res = await excluirHorario(horarioId);
    setCarregando(false);
    if (res.ok) {
      setAberto(false);
      toast.success("Horário removido.");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  const acimaCap = capacidade != null && selecionados.size > capacidade;

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        setAberto(v);
        if (v) {
          setSelecionados(new Set(atribuidos));
          setConfirmando(false);
        }
      }}
    >
      <DialogTrigger
        aria-label={`Gerenciar aula ${rotulo}`}
        className={cn(
          "inline-flex min-w-12 items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset transition-transform hover:scale-105 focus-visible:ring-2",
          cheio
            ? "bg-amber-50 text-amber-700 ring-amber-600/20"
            : livre
              ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
              : "bg-sky-50 text-sky-700 ring-sky-600/20",
        )}
      >
        {livre ? "Livre" : `${n}${capacidade != null ? `/${capacidade}` : ""}`}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Aula {rotulo}</DialogTitle>
          <DialogDescription>
            Marque os alunos desta aula. Eles aparecem na presença ao
            selecionar este horário.
          </DialogDescription>
        </DialogHeader>

        {alunos.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Nenhum aluno ativo na sua carteira.
          </p>
        ) : (
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {alunos.map((a) => (
              <label
                key={a.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/60"
              >
                <Checkbox
                  checked={selecionados.has(a.id)}
                  onCheckedChange={(v) => alternar(a.id, v === true)}
                />
                <AvatarIniciais nome={a.nome} tamanho="sm" />
                <span className="text-sm font-medium">{a.nome}</span>
              </label>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {selecionados.size} selecionado(s)
          {capacidade != null ? ` · capacidade ${capacidade}` : ""}
          {acimaCap ? " (acima da capacidade)" : ""}
        </p>

        <DialogFooter
          className={permitirRemover ? "sm:justify-between" : undefined}
        >
          {permitirRemover ? (
            <Button
              type="button"
              variant={confirmando ? "destructive" : "outline"}
              size="sm"
              onClick={remover}
              disabled={carregando}
            >
              <Trash2 className="size-4" />
              {confirmando ? "Confirmar remoção" : "Remover horário"}
            </Button>
          ) : null}
          <div className="flex gap-2">
            <DialogClose
              render={<Button type="button" variant="outline" />}
              disabled={carregando}
            >
              Cancelar
            </DialogClose>
            <Button type="button" onClick={salvar} loading={carregando}>
              {carregando ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
