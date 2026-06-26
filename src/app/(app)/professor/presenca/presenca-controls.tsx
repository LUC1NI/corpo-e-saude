"use client";

import { useRouter } from "next/navigation";

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

  function irPara(novaData: string, novaHora: string | null) {
    const params = new URLSearchParams();
    params.set("data", novaData);
    if (novaHora) params.set("hora", novaHora);
    router.push(`/professor/presenca?${params.toString()}`);
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
      <CampoForm label="Horário" dica="Opcional — vincula a presença a um horário.">
        <Select
          value={hora ?? SEM_HORARIO}
          onValueChange={(v) => irPara(data, v === SEM_HORARIO ? null : v)}
          items={{
            [SEM_HORARIO]: "Sem horário",
            ...Object.fromEntries(
              slots.map((s) => [
                s.hora_inicio,
                `${horaCurta(s.hora_inicio)}–${horaCurta(s.hora_fim)}`,
              ]),
            ),
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sem horário" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SEM_HORARIO}>Sem horário</SelectItem>
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
