"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "@/components/ui-extra/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CampoForm } from "@/components/ui-extra/campo-form";
import { planoSchema, type PlanoInput } from "@/lib/schemas";
import { cn } from "@/lib/utils";

import { atualizarPlano, criarPlano } from "./actions";

export function PlanoForm({
  planoId,
  valoresIniciais,
}: {
  planoId?: string;
  valoresIniciais?: Partial<PlanoInput>;
}) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<z.input<typeof planoSchema>, unknown, PlanoInput>({
    resolver: zodResolver(planoSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      periodicidade: "mensal",
      ativo: true,
      ...valoresIniciais,
    },
  });

  async function onSubmit(values: PlanoInput) {
    setSalvando(true);
    const res = planoId
      ? await atualizarPlano(planoId, values)
      : await criarPlano(values);
    setSalvando(false);

    if (res.ok) {
      toast.success(planoId ? "Plano atualizado." : "Plano criado.");
      router.push("/admin/planos");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-5">
      <CampoForm label="Nome do plano" htmlFor="nome" obrigatorio erro={errors.nome?.message}>
        <Input id="nome" {...register("nome")} placeholder="Ex.: Mensal Presencial" />
      </CampoForm>

      <div className="grid gap-5 sm:grid-cols-2">
        <CampoForm
          label="Valor (R$)"
          htmlFor="valor"
          obrigatorio
          erro={errors.valor?.message}
        >
          <Input
            id="valor"
            type="number"
            step="0.01"
            min="0"
            {...register("valor")}
            placeholder="0,00"
          />
        </CampoForm>

        <CampoForm label="Periodicidade" erro={errors.periodicidade?.message}>
          <Controller
            control={control}
            name="periodicidade"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                items={{
                  mensal: "Mensal",
                  trimestral: "Trimestral",
                  semestral: "Semestral",
                  anual: "Anual",
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="semestral">Semestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </CampoForm>
      </div>

      <CampoForm
        label="Duração (meses)"
        htmlFor="duracao_meses"
        dica="Opcional: deixe vazio para plano sem prazo definido."
        erro={errors.duracao_meses?.message}
      >
        <Input
          id="duracao_meses"
          type="number"
          min="1"
          {...register("duracao_meses")}
          placeholder="Ex.: 3"
        />
      </CampoForm>

      <CampoForm label="Descrição" htmlFor="descricao" erro={errors.descricao?.message}>
        <Textarea
          id="descricao"
          {...register("descricao")}
          placeholder="Detalhes do plano (opcional)"
          rows={3}
        />
      </CampoForm>

      <Controller
        control={control}
        name="ativo"
        render={({ field }) => (
          <label className="flex items-center gap-3">
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
            />
            <span className="text-sm font-medium">Plano ativo</span>
          </label>
        )}
      />

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" loading={salvando}>
          {salvando ? "Salvando…" : "Salvar plano"}
        </Button>
        <Link
          href="/admin/planos"
          className={cn(buttonVariants({ variant: "ghost" }))}
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
