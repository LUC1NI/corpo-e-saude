"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { LucideIcon } from "lucide-react";
import { Calendar, Mail, Phone, User } from "lucide-react";
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
import { CampoForm } from "@/components/ui-extra/campo-form";
import { alunoSchema, type AlunoInput } from "@/lib/schemas";
import { cn } from "@/lib/utils";

import { atualizarAluno, criarAluno } from "./actions";

const SEM_PROFESSOR = "__none__";

/** Altura/contraste padrão dos controles deste formulário. */
const CONTROLE = "h-10 bg-secondary/40 data-[size=default]:h-10";

/** Input com ícone à esquerda, mais alto e com fundo sutil (mais visível). */
function CampoComIcone({
  icone: Icone,
  className,
  ...props
}: React.ComponentProps<typeof Input> & { icone: LucideIcon }) {
  return (
    <div className="relative">
      <Icone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input className={cn(CONTROLE, "pl-9", className)} {...props} />
    </div>
  );
}

/** Cabeçalho de seção do formulário. */
function SecaoForm({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {titulo}
      </h3>
      {children}
    </section>
  );
}

export function AlunoForm({
  alunoId,
  valoresIniciais,
  professores,
  mostrarProfessor = true,
  destinoBase = "/admin/alunos",
  hashAposCriar = "",
}: {
  alunoId?: string;
  valoresIniciais?: Partial<AlunoInput>;
  professores: { id: string; nome: string }[];
  /** Mostra o seletor de professor (só no admin). */
  mostrarProfessor?: boolean;
  /** Base das rotas de aluno (ex.: "/professor/alunos"). */
  destinoBase?: string;
  /** Âncora ao abrir o aluno recém-criado (ex.: "#anamnese"). */
  hashAposCriar?: string;
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
        !alunoId && res.dados
          ? `${destinoBase}/${res.dados.id}${hashAposCriar}`
          : destinoBase;
      router.push(destino);
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-7">
      <SecaoForm titulo="Dados pessoais">
        <CampoForm
          label="Nome completo"
          htmlFor="nome"
          obrigatorio
          erro={errors.nome?.message}
        >
          <CampoComIcone
            id="nome"
            icone={User}
            {...register("nome")}
            placeholder="Nome do aluno"
          />
        </CampoForm>

        <div className="grid gap-5 sm:grid-cols-2">
          <CampoForm
            label="Data de nascimento"
            htmlFor="data_nascimento"
            erro={errors.data_nascimento?.message}
          >
            <CampoComIcone
              id="data_nascimento"
              type="date"
              icone={Calendar}
              {...register("data_nascimento")}
            />
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
                  <SelectTrigger className={cn(CONTROLE, "w-full")}>
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
      </SecaoForm>

      <SecaoForm titulo="Contato">
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoForm
            label="E-mail"
            htmlFor="email"
            dica="Necessário para gerar o acesso do aluno."
            erro={errors.email?.message}
          >
            <CampoComIcone
              id="email"
              type="email"
              icone={Mail}
              {...register("email")}
              placeholder="aluno@exemplo.com"
            />
          </CampoForm>

          <CampoForm
            label="Telefone"
            htmlFor="telefone"
            erro={errors.telefone?.message}
          >
            <CampoComIcone
              id="telefone"
              icone={Phone}
              {...register("telefone")}
              placeholder="(47) 99999-0000"
            />
          </CampoForm>
        </div>
      </SecaoForm>

      <SecaoForm titulo="Vínculo e situação">
        <div className="grid gap-5 sm:grid-cols-2">
          {mostrarProfessor ? (
            <CampoForm
              label="Professor responsável"
              erro={errors.professor_id?.message}
            >
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
                      ...Object.fromEntries(
                        professores.map((p) => [p.id, p.nome]),
                      ),
                    }}
                  >
                    <SelectTrigger className={cn(CONTROLE, "w-full")}>
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
          ) : null}

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
                  <SelectTrigger className={cn(CONTROLE, "w-full")}>
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
      </SecaoForm>

      <div className="flex items-center gap-3 border-t pt-5">
        <Button type="submit" loading={salvando}>
          {salvando ? "Salvando…" : "Salvar aluno"}
        </Button>
        <Link href={destinoBase} className={cn(buttonVariants({ variant: "ghost" }))}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
