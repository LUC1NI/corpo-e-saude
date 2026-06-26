"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CampoForm } from "@/components/ui-extra/campo-form";
import { salvarAnamnese } from "@/lib/acoes-acompanhamento";
import { anamneseSchema, type AnamneseInput } from "@/lib/schemas";

const NIVEIS = ["Sedentário", "Leve", "Moderado", "Intenso", "Atleta"];
const SEM_NIVEL = "__none__";

export function AnamneseForm({
  alunoId,
  valoresIniciais,
}: {
  alunoId: string;
  valoresIniciais?: Partial<AnamneseInput>;
}) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);

  const { register, handleSubmit, control } = useForm<
    z.input<typeof anamneseSchema>,
    unknown,
    AnamneseInput
  >({
    resolver: zodResolver(anamneseSchema),
    defaultValues: {
      historico_saude: "",
      lesoes_restricoes: "",
      medicacao: "",
      objetivos: "",
      rotina_disponibilidade: "",
      nivel_atividade: "",
      ...valoresIniciais,
    },
  });

  async function onSubmit(values: AnamneseInput) {
    setSalvando(true);
    const res = await salvarAnamnese(alunoId, values);
    setSalvando(false);
    if (res.ok) {
      toast.success("Anamnese salva.");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <CampoForm label="Objetivos" htmlFor="objetivos">
        <Textarea
          id="objetivos"
          rows={2}
          {...register("objetivos")}
          placeholder="O que o aluno busca (emagrecimento, hipertrofia, saúde…)"
        />
      </CampoForm>

      <div className="grid gap-5 sm:grid-cols-2">
        <CampoForm label="Histórico de saúde" htmlFor="historico_saude">
          <Textarea
            id="historico_saude"
            rows={3}
            {...register("historico_saude")}
            placeholder="Condições, cirurgias, doenças…"
          />
        </CampoForm>
        <CampoForm label="Lesões e restrições" htmlFor="lesoes_restricoes">
          <Textarea
            id="lesoes_restricoes"
            rows={3}
            {...register("lesoes_restricoes")}
            placeholder="Lesões, limitações, dores…"
          />
        </CampoForm>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <CampoForm label="Medicação" htmlFor="medicacao">
          <Textarea
            id="medicacao"
            rows={2}
            {...register("medicacao")}
            placeholder="Medicamentos em uso"
          />
        </CampoForm>
        <CampoForm
          label="Rotina e disponibilidade"
          htmlFor="rotina_disponibilidade"
        >
          <Textarea
            id="rotina_disponibilidade"
            rows={2}
            {...register("rotina_disponibilidade")}
            placeholder="Dias/horários disponíveis, rotina de trabalho…"
          />
        </CampoForm>
      </div>

      <CampoForm label="Nível de atividade">
        <Controller
          control={control}
          name="nivel_atividade"
          render={({ field }) => (
            <Select
              value={field.value ? String(field.value) : SEM_NIVEL}
              onValueChange={(v) =>
                field.onChange(v === SEM_NIVEL ? undefined : v)
              }
              items={{
                [SEM_NIVEL]: "Não informado",
                ...Object.fromEntries(NIVEIS.map((n) => [n, n])),
              }}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_NIVEL}>Não informado</SelectItem>
                {NIVEIS.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </CampoForm>

      <Button type="submit" disabled={salvando}>
        {salvando ? "Salvando…" : "Salvar anamnese"}
      </Button>
    </form>
  );
}
