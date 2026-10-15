"use client";

import { Clock, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import type { HorarioOpcao } from "@/components/alunos/cadastro-rapido";
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
import { definirHorariosDoAluno } from "@/lib/acoes-presenca";
import { cn } from "@/lib/utils";


const DIAS_LONGOS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/**
 * Horários fixos de um aluno presencial: lista e edição (toque nos horários
 * do professor dele). Aula cheia fica desabilitada.
 */
export function HorariosDoAluno({
  alunoId,
  atuais,
  opcoes,
  semProfessor,
}: {
  alunoId: string;
  atuais: string[];
  /** Horários do professor do aluno, com ocupação. */
  opcoes: HorarioOpcao[];
  semProfessor: boolean;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set(atuais));
  const [salvando, setSalvando] = useState(false);

  const escolhidos = opcoes.filter((o) => atuais.includes(o.id));
  const porDia = new Map<number, HorarioOpcao[]>();
  for (const o of opcoes) porDia.set(o.dia_semana, [...(porDia.get(o.dia_semana) ?? []), o]);
  const dias = [...porDia.keys()].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));

  async function salvar() {
    setSalvando(true);
    const res = await definirHorariosDoAluno(alunoId, [...sel]);
    setSalvando(false);
    if (!res.ok) {
      toast.error(res.erro);
      return;
    }
    setAberto(false);
    toast.success("Horários atualizados");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {escolhidos.length === 0 ? (
        <p className="flex items-center gap-2 text-muted-foreground">
          <Clock className="size-4" />
          {semProfessor ? "Escolha o professor do aluno em Dados para definir os horários." : "Ainda sem horário fixo."}
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {[...escolhidos]
            .sort((a, b) => ((a.dia_semana + 6) % 7) - ((b.dia_semana + 6) % 7) || a.hora_inicio.localeCompare(b.hora_inicio))
            .map((h) => (
              <li key={h.id} className="flex min-h-12 items-center gap-3 rounded-xl bg-secondary/60 px-4">
                <Clock className="size-4 text-primary" />
                <span className="font-semibold">{DIAS_LONGOS[h.dia_semana]}</span>
                <span className="tabular-nums text-muted-foreground">{h.hora_inicio.slice(0, 5)}</span>
              </li>
            ))}
        </ul>
      )}

      {!semProfessor ? (
        <Dialog
          open={aberto}
          onOpenChange={(v) => {
            setAberto(v);
            if (v) setSel(new Set(atuais));
          }}
        >
          <DialogTrigger render={<Button variant="outline" />}>
            <Pencil className="size-4" />
            {escolhidos.length === 0 ? "Definir horários" : "Alterar horários"}
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Horários fixos</DialogTitle>
              <DialogDescription>Toque nas aulas em que o aluno treina toda semana.</DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] space-y-3 overflow-y-auto">
              {dias.map((d) => (
                <div key={d}>
                  <p className="mb-1.5 text-sm font-semibold">{DIAS_LONGOS[d]}</p>
                  <div className="flex flex-wrap gap-2">
                    {porDia.get(d)!.map((o) => {
                      const marcado = sel.has(o.id);
                      const cheio = !atuais.includes(o.id) && o.capacidade != null && o.ocupados >= o.capacidade;
                      return (
                        <button
                          key={o.id}
                          type="button"
                          aria-pressed={marcado}
                          disabled={cheio}
                          onClick={() =>
                            setSel((s) => {
                              const n = new Set(s);
                              if (n.has(o.id)) n.delete(o.id);
                              else n.add(o.id);
                              return n;
                            })
                          }
                          className={cn(
                            "h-11 rounded-full border px-3 text-sm font-semibold tabular-nums transition-colors sm:h-9",
                            marcado ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                            cheio && "cursor-not-allowed border-dashed opacity-50",
                          )}
                        >
                          {o.hora_inicio.slice(0, 5)}
                          {cheio ? " · cheio" : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {dias.length === 0 ? <p className="text-sm text-muted-foreground">O professor ainda não tem horários na grade.</p> : null}
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
              <Button onClick={salvar} loading={salvando}>
                Salvar horários
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
