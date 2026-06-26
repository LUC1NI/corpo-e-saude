"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CampoForm } from "@/components/ui-extra/campo-form";
import { criarHorario } from "@/lib/acoes-presenca";
import { DIAS_SEMANA } from "@/lib/tipos";

export function HorarioForm() {
  const router = useRouter();
  const [dia, setDia] = useState("1");
  const [inicio, setInicio] = useState("06:00");
  const [fim, setFim] = useState("07:00");
  const [capacidade, setCapacidade] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function adicionar() {
    setSalvando(true);
    const res = await criarHorario({
      dia_semana: Number(dia),
      hora_inicio: inicio,
      hora_fim: fim,
      capacidade: capacidade === "" ? undefined : Number(capacidade),
    });
    setSalvando(false);
    if (res.ok) {
      toast.success("Horário adicionado.");
      setCapacidade("");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto]">
      <CampoForm label="Dia da semana">
        <Select
          value={dia}
          onValueChange={(v) => setDia(v ?? "1")}
          items={Object.fromEntries(DIAS_SEMANA.map((n, i) => [String(i), n]))}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DIAS_SEMANA.map((nome, i) => (
              <SelectItem key={i} value={String(i)}>
                {nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CampoForm>
      <CampoForm label="Início" htmlFor="ini">
        <Input
          id="ini"
          type="time"
          value={inicio}
          onChange={(e) => setInicio(e.target.value)}
          className="w-32"
        />
      </CampoForm>
      <CampoForm label="Fim" htmlFor="fim">
        <Input
          id="fim"
          type="time"
          value={fim}
          onChange={(e) => setFim(e.target.value)}
          className="w-32"
        />
      </CampoForm>
      <CampoForm label="Capacidade" htmlFor="cap" dica="Opcional">
        <Input
          id="cap"
          type="number"
          min="1"
          value={capacidade}
          onChange={(e) => setCapacidade(e.target.value)}
          placeholder="—"
          className="w-24"
        />
      </CampoForm>
      <Button type="button" onClick={adicionar} disabled={salvando}>
        <Plus className="size-4" />
        {salvando ? "…" : "Adicionar"}
      </Button>
    </div>
  );
}
