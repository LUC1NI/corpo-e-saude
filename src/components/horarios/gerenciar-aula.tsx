"use client";

import { Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { AvatarIniciais } from "@/components/ui-extra/avatar-iniciais";
import { definirAlunosDoHorario, excluirHorario } from "@/lib/acoes-presenca";
import { iniciais, plural } from "@/lib/formato";
import { cn } from "@/lib/utils";

/** Cor da célula pela lotação: vazio (cinza) → parcial (azul claro) → cheio (azul forte). */
export function tomOcupacao(n: number, capacidade: number | null) {
  if (n === 0) return "bg-muted text-muted-foreground ring-border";
  if (capacidade != null && n >= capacidade)
    return "bg-primary text-primary-foreground ring-primary";
  return "bg-sky-50 text-sky-800 ring-sky-600/25";
}

/**
 * Célula/chip de uma aula da grade. Ao tocar, abre a turma: marcar/desmarcar
 * alunos (com busca) e, se permitido, remover o horário.
 * `alunos` = quem pode entrar na turma; `atribuidos` = ids já na turma.
 */
export function GerenciarAula({
  horarioId,
  rotulo,
  alunos,
  atribuidos,
  capacidade,
  permitirRemover = true,
  mostrarIniciais = false,
}: {
  horarioId: string;
  rotulo: string;
  alunos: { id: string; nome: string }[];
  atribuidos: string[];
  capacidade: number | null;
  /** Mostra o botão "Remover horário" dentro da janela. */
  permitirRemover?: boolean;
  /** Mostra as iniciais dos alunos na própria célula (grade do desktop). */
  mostrarIniciais?: boolean;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set(atribuidos));

  const n = atribuidos.length;
  const nomePorId = useMemo(() => new Map(alunos.map((a) => [a.id, a.nome])), [alunos]);
  const nomesTurma = atribuidos.map((id) => nomePorId.get(id) ?? "Aluno");

  // Na janela: já marcados primeiro, depois em ordem alfabética; com filtro.
  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return [...alunos]
      .filter((a) => !termo || a.nome.toLowerCase().includes(termo))
      .sort(
        (a, b) =>
          Number(atribuidos.includes(b.id)) - Number(atribuidos.includes(a.id)) ||
          a.nome.localeCompare(b.nome),
      );
  }, [alunos, atribuidos, busca]);

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
      toast.success(`Turma das ${rotulo.split(" ").pop()} atualizada`);
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
  const contagem = `${n}${capacidade != null ? `/${capacidade}` : ""}`;

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        setAberto(v);
        if (v) {
          setSelecionados(new Set(atribuidos));
          setConfirmando(false);
          setBusca("");
        }
      }}
    >
      <DialogTrigger
        aria-label={`Aula ${rotulo}: ${n === 0 ? "sem alunos" : nomesTurma.join(", ")}. Abrir turma`}
        title={nomesTurma.join(", ") || "Sem alunos"}
        className={cn(
          "inline-flex min-h-11 min-w-14 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold tabular-nums ring-1 ring-inset transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary sm:min-h-8",
          tomOcupacao(n, capacidade),
        )}
      >
        {n === 0 ? "Vazio" : contagem}
        {mostrarIniciais && n > 0 ? (
          <span className="hidden items-center gap-0.5 font-medium opacity-80 lg:inline-flex">
            · {nomesTurma.slice(0, 3).map(iniciais).join(" ")}
            {n > 3 ? ` +${n - 3}` : ""}
          </span>
        ) : null}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Turma {rotulo}</DialogTitle>
          <DialogDescription>
            Marque quem treina neste horário toda semana.
          </DialogDescription>
        </DialogHeader>

        {alunos.length > 8 ? (
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar aluno"
              aria-label="Buscar aluno"
              className="pl-9"
            />
          </div>
        ) : null}

        {alunos.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">Nenhum aluno ativo.</p>
        ) : (
          <div className="max-h-72 space-y-0.5 overflow-y-auto">
            {lista.map((a) => (
              <label
                key={a.id}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-muted/60"
              >
                <Checkbox
                  checked={selecionados.has(a.id)}
                  onCheckedChange={(v) => alternar(a.id, v === true)}
                />
                <AvatarIniciais nome={a.nome} tamanho="sm" />
                <span className="text-sm font-medium">{a.nome}</span>
              </label>
            ))}
            {lista.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">Ninguém com esse nome.</p>
            ) : null}
          </div>
        )}

        <p className={cn("text-sm", acimaCap ? "font-medium text-amber-700" : "text-muted-foreground")}>
          {plural(selecionados.size, "aluno", "alunos")}
          {capacidade != null ? ` de ${capacidade} vagas` : ""}
          {acimaCap ? " · acima da capacidade" : ""}
        </p>

        <DialogFooter className={permitirRemover ? "sm:justify-between" : undefined}>
          {permitirRemover ? (
            <Button
              type="button"
              variant={confirmando ? "destructive" : "ghost"}
              size="sm"
              onClick={remover}
              disabled={carregando}
              className={confirmando ? undefined : "text-muted-foreground"}
            >
              <Trash2 className="size-4" />
              {confirmando ? "Sim, remover horário" : "Remover horário"}
            </Button>
          ) : null}
          <div className="flex gap-2">
            <DialogClose render={<Button type="button" variant="outline" />} disabled={carregando}>
              Cancelar
            </DialogClose>
            <Button type="button" onClick={salvar} loading={carregando}>
              Salvar turma
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
