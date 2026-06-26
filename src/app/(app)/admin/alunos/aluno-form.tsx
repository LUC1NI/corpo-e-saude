"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
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
import { CampoForm } from "@/components/ui-extra/campo-form";
import { alunoSchema, type AlunoInput } from "@/lib/schemas";
import { cn } from "@/lib/utils";

import { atualizarAluno, criarAluno } from "./actions";

const SEM_PROFESSOR = "__none__";

export function AlunoForm({
  alunoId,
  valoresIniciais,
  professores,
}: {
  alunoId?: string;
  valoresIniciais?: Partial<AlunoInput>;
  professores: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<z.input<typeof alunoSchema>, unknown, AlunoInput>({
    resolver: zodResolver(alunoSchema),
    defaultValues: {
      nome: "",
      email: "",
      telefone: "",
      data_nascimento: "",
      tipo: "presencial",
      status: "ativo",
      ...valoresIniciais,
    },
  });

  async function onSubmit(values: AlunoInput) {
    setSalvando(true);
    const res = alunoId
      ? await atualizarAluno(alunoId, values)
      : await criarAluno(values);
    setSalvando(false);

    if (res.ok) {
      toast.success(alunoId ? "Aluno atualizado." : "Aluno cadastrado.");
      const destino =
        !alunoId && res.dados ? `/admin/alunos/${res.dados.id}` : "/admin/alunos";
      router.push(destino);
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-5">
      <CampoForm label="Nome completo" htmlFor="nome" obrigatorio erro={errors.nome?.message}>
        <Input id="nome" {...register("nome")} placeholder="Nome do aluno" />
      </CampoForm>

      <div className="grid gap-5 sm:grid-cols-2">
        <CampoForm
          label="E-mail"
          htmlFor="email"
          dica="Necessário para gerar o acesso do aluno."
          erro={errors.email?.message}
        >
          <Input
            id="email"
            type="email"
            {...register("email")}
            placeholder="aluno@exemplo.com"
          />
        </CampoForm>

        <CampoForm label="Telefone" htmlFor="telefone" erro={errors.telefone?.message}>
          <Input id="telefone" {...register("telefone")} placeholder="(47) 99999-0000" />
        </CampoForm>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <CampoForm
          label="Data de nascimento"
          htmlFor="data_nascimento"
          erro={errors.data_nascimento?.message}
        >
          <Input id="data_nascimento" type="date" {...register("data_nascimento")} />
        </CampoForm>

        <CampoForm label="Tipo" erro={errors.tipo?.message}>
          <Controller
            control={control}
            name="tipo"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                items={{ presencial: "Presencial", online: "Online" }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </CampoForm>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <CampoForm label="Professor responsável" erro={errors.professor_id?.message}>
          <Controller
            control={control}
            name="professor_id"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : SEM_PROFESSOR}
                onValueChange={(v) =>
                  field.onChange(v === SEM_PROFESSOR ? undefined : v)
                }
                items={{
                  [SEM_PROFESSOR]: "Sem professor",
                  ...Object.fromEntries(professores.map((p) => [p.id, p.nome])),
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_PROFESSOR}>Sem professor</SelectItem>
                  {professores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </CampoForm>

        <CampoForm label="Status" erro={errors.status?.message}>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                items={{ ativo: "Ativo", inativo: "Inativo" }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </CampoForm>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar aluno"}
        </Button>
        <Link href="/admin/alunos" className={cn(buttonVariants({ variant: "ghost" }))}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
