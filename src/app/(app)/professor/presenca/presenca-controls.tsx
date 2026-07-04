"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

import { progressoNavegacao } from "@/components/ui-extra/progresso-navegacao";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CampoForm } from "@/components/ui-extra/campo-form";
import { horaCurta } from "@/lib/tipos";

const SEM_HORARIO = "__none__";

export function PresencaControls({
  data,
  hora,
  slots,
}: {
  data: string;
  hora: string | null;
  slots: { hora_inicio: string; hora_fim: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Enquanto a nova consulta carrega, mantém a barra de progresso no topo.
  useEffect(() => {
    if (!pending) return;
    progressoNavegacao.iniciar();
    return () => {
      progressoNavegacao.terminar();
    };
  }, [pending]);

  function irPara(novaData: string, novaHora: string | null) {
    const params = new URLSearchParams();
    params.set("data", novaData);
    if (novaHora) params.set("hora", novaHora);
    startTransition(() => {
      router.push(`/professor/presenca?${params.toString()}`);
    });
  }

  return (
    <div className="grid items-end gap-3 sm:grid-cols-2">
      <CampoForm label="Data">
        <Input
          type="date"
          value={data}
          onChange={(e) => irPara(e.target.value, null)}
          className="w-44"
        />
      </CampoForm>
      <CampoForm
        label="Aula / horário"
        dica={
          slots.length
            ? "A 1ª aula do dia já vem selecionada. Use “sem horário” só para avulso/online."
            : "Sem aulas neste dia: a presença fica como avulsa."
        }
      >
        <Select
          value={hora ?? SEM_HORARIO}
          onValueChange={(v) => irPara(data, v)}
          items={{
            [SEM_HORARIO]: "Sem horário (avulso/online)",
            ...Object.fromEntries(
              slots.map((s) => [
                s.hora_inicio,
                `${horaCurta(s.hora_inicio)}–${horaCurta(s.hora_fim)}`,
              ]),
            ),
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sem horário (avulso/online)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SEM_HORARIO}>
              Sem horário (avulso/online)
            </SelectItem>
            {slots.map((s) => (
              <SelectItem key={s.hora_inicio} value={s.hora_inicio}>
                {horaCurta(s.hora_inicio)}–{horaCurta(s.hora_fim)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CampoForm>
    </div>
  );
}
