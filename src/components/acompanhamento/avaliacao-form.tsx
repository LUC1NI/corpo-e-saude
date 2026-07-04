"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CampoForm } from "@/components/ui-extra/campo-form";
import { criarAvaliacao } from "@/lib/acoes-acompanhamento";
import { hojeISO } from "@/lib/financeiro";
import { avaliacaoSchema, MEDIDAS_CAMPOS, type AvaliacaoInput } from "@/lib/schemas";

export function AvaliacaoForm({ alunoId }: { alunoId: string }) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);

  const { register, handleSubmit, reset } = useForm<
    z.input<typeof avaliacaoSchema>,
    unknown,
    AvaliacaoInput
  >({
    resolver: zodResolver(avaliacaoSchema),
    defaultValues: { data: hojeISO() },
  });

  async function onSubmit(values: AvaliacaoInput) {
    setSalvando(true);
    const res = await criarAvaliacao(alunoId, values);
    setSalvando(false);
    if (res.ok) {
      toast.success("Avaliação registrada.");
      reset({ data: hojeISO() });
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-4">
        <CampoForm label="Data" htmlFor="data" obrigatorio>
          <Input id="data" type="date" {...register("data")} />
        </CampoForm>
        <CampoForm label="Peso (kg)" htmlFor="peso">
          <Input id="peso" type="number" step="0.1" {...register("peso")} />
        </CampoForm>
        <CampoForm label="Altura (m)" htmlFor="altura">
          <Input
            id="altura"
            type="number"
            step="0.01"
            placeholder="1.70"
            {...register("altura")}
          />
        </CampoForm>
        <CampoForm label="% Gordura" htmlFor="pg">
          <Input
            id="pg"
            type="number"
            step="0.1"
            {...register("percentual_gordura")}
          />
        </CampoForm>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Medidas (cm)</p>
        <div className="grid gap-4 sm:grid-cols-5">
          {MEDIDAS_CAMPOS.map((m) => (
            <CampoForm key={m.chave} label={m.rotulo} htmlFor={m.chave}>
              <Input
                id={m.chave}
                type="number"
                step="0.1"
                {...register(m.chave)}
              />
            </CampoForm>
          ))}
        </div>
      </div>

      <CampoForm label="Observações" htmlFor="obs">
        <Textarea id="obs" rows={2} {...register("observacoes")} />
      </CampoForm>

      <Button type="submit" loading={salvando}>
        <Plus className="size-4" />
        {salvando ? "Salvando…" : "Registrar avaliação"}
      </Button>
    </form>
  );
}
