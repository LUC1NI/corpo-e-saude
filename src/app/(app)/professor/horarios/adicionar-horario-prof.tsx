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
import { CampoForm } from "@/components/ui-extra/campo-form";
import { criarHorariosProfessor } from "@/lib/acoes-presenca";
import { cn } from "@/lib/utils";
import { plural } from "@/lib/formato";

const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function maisUmaHora(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const nh = ((h ?? 0) + 1) % 24;
  return `${String(nh).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}`;
}

export function AdicionarHorarioProf({ diaInicial }: { diaInicial: number }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [fimManual, setFimManual] = useState(false);
  const [capacidade, setCapacidade] = useState("");
  const [dias, setDias] = useState<Set<number>>(new Set([diaInicial]));

  function reset() {
    setInicio("");
    setFim("");
    setFimManual(false);
    setCapacidade("");
    setDias(new Set([diaInicial]));
  }

  function mudarInicio(v: string) {
    setInicio(v);
    if (v && !fimManual) setFim(maisUmaHora(v));
  }

  function alternarDia(n: number) {
    setDias((atual) => {
      const novo = new Set(atual);
      if (novo.has(n)) novo.delete(n);
      else novo.add(n);
      return novo;
    });
  }

  async function salvar() {
    if (!inicio || !fim) return toast.error("Informe o início e o fim.");
    if (dias.size === 0) return toast.error("Selecione ao menos um dia.");

    setCarregando(true);
    const res = await criarHorariosProfessor(
      [...dias],
      inicio,
      fim,
      capacidade === "" ? undefined : Number(capacidade),
    );
    setCarregando(false);

    if (res.ok && res.dados) {
      const { criados, pulados } = res.dados;
      if (criados === 0) {
        toast.info("Esse horário já existia nos dias selecionados.");
      } else {
        toast.success(
          plural(criados, "horário criado", "horários criados") +
            (pulados > 0 ? ` · ${pulados} já existia(m)` : "") +
            ".",
        );
        setAberto(false);
        reset();
        router.refresh();
      }
    } else if (!res.ok) {
      toast.error(res.erro);
    }
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        setAberto(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
        <Plus className="size-4" />
        Adicionar horário
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo horário</DialogTitle>
          <DialogDescription>
            Defina o horário e marque os dias em que ele se repete.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <CampoForm label="Início" htmlFor="hi" obrigatorio>
              <Input
                id="hi"
                type="time"
                step={3600}
                value={inicio}
                onChange={(e) => mudarInicio(e.target.value)}
              />
            </CampoForm>
            <CampoForm label="Fim" htmlFor="hf" obrigatorio>
              <Input
                id="hf"
                type="time"
                step={3600}
                value={fim}
                onChange={(e) => {
                  setFim(e.target.value);
                  setFimManual(true);
                }}
              />
            </CampoForm>
            <CampoForm label="Cap." htmlFor="cap" dica="Opcional.">
              <Input
                id="cap"
                type="number"
                min={1}
                inputMode="numeric"
                value={capacidade}
                onChange={(e) => setCapacidade(e.target.value)}
                placeholder="6"
              />
            </CampoForm>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Dias</p>
            <div className="grid grid-cols-7 gap-1.5">
              {DIAS_CURTOS.map((rotulo, n) => {
                const marcado = dias.has(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => alternarDia(n)}
                    aria-pressed={marcado}
                    className={cn(
                      "rounded-lg border py-2 text-xs font-medium transition-colors",
                      marcado
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {rotulo}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose
            render={<Button type="button" variant="outline" />}
            disabled={carregando}
          >
            Cancelar
          </DialogClose>
          <Button type="button" onClick={salvar} loading={carregando}>
            {carregando ? "Salvando…" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
