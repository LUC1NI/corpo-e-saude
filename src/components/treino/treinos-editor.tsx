"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Dumbbell, Layers, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { StatusBadge } from "@/components/ui-extra/status-badge";
import { TabelaResponsiva } from "@/components/ui-extra/tabela-responsiva";
import { AplicarTemplate } from "@/components/treino/aplicar-template";
import { BotaoExcluir } from "@/components/treino/botao-excluir";
import { MidiaThumb } from "@/components/treino/midia-thumb";
import { SeletorDiasSemana } from "@/components/treino/seletor-dias";
import {
  adicionarTreinoExercicio,
  atualizarDivisao,
  atualizarTreino,
  atualizarTreinoExercicio,
  criarDivisao,
  criarTreino,
  excluirDivisao,
  excluirTreino,
  removerTreinoExercicio,
} from "@/lib/acoes-treino";
import {
  divisaoSchema,
  treinoExercicioSchema,
  treinoSchema,
  type DivisaoInput,
  type TreinoExercicioInput,
  type TreinoInput,
} from "@/lib/schemas";
import { DIAS_SEMANA_CURTO } from "@/lib/tipos";
import type {
  DivisaoComExercicios,
  Exercicio,
  Treino,
  TreinoComTudo,
  TreinoDivisao,
  TreinoExercicio,
} from "@/lib/tipos";

// ===========================================================================
// Dialog: ficha de treino
// ===========================================================================
function FichaDialog({
  alunoId,
  ficha,
  gatilho,
}: {
  alunoId: string;
  ficha?: Treino;
  gatilho: React.ReactNode;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof treinoSchema>, unknown, TreinoInput>({
    resolver: zodResolver(treinoSchema),
    defaultValues: {
      nome: ficha?.nome ?? "",
      objetivo: ficha?.objetivo ?? "",
      ativo: ficha?.ativo ?? true,
    },
  });

  async function onSubmit(values: TreinoInput) {
    setSalvando(true);
    const res = ficha
      ? await atualizarTreino(ficha.id, alunoId, values)
      : await criarTreino(alunoId, values);
    setSalvando(false);
    if (res.ok) {
      toast.success(ficha ? "Ficha atualizada." : "Ficha criada.");
      setAberto(false);
      if (!ficha) reset();
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={gatilho as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{ficha ? "Editar ficha" : "Nova ficha"}</DialogTitle>
          <DialogDescription>
            Cada ficha agrupa as divisões (Treino A, B, C…) do aluno.
          </DialogDescription>
        </DialogHeader>

        <form id="form-ficha" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <CampoForm label="Nome" htmlFor="ficha-nome" obrigatorio erro={errors.nome?.message}>
            <Input
              id="ficha-nome"
              {...register("nome")}
              placeholder="Ex.: Hipertrofia — 2026/2º sem."
            />
          </CampoForm>
          <CampoForm label="Objetivo" htmlFor="ficha-objetivo" erro={errors.objetivo?.message}>
            <Textarea
              id="ficha-objetivo"
              rows={2}
              {...register("objetivo")}
              placeholder="Foco do treino (opcional)"
            />
          </CampoForm>
          <Controller
            control={control}
            name="ativo"
            render={({ field }) => (
              <label className="flex items-center gap-3">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
                <span className="text-sm font-medium">Ficha ativa</span>
              </label>
            )}
          />
        </form>

        <DialogFooter>
          <Button type="submit" form="form-ficha" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===========================================================================
// Dialog: divisão (A/B/C)
// ===========================================================================
function DivisaoDialog({
  alunoId,
  treinoId,
  divisao,
  ordem,
  gatilho,
}: {
  alunoId: string;
  treinoId: string;
  divisao?: TreinoDivisao;
  ordem: number;
  gatilho: React.ReactNode;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof divisaoSchema>, unknown, DivisaoInput>({
    resolver: zodResolver(divisaoSchema),
    defaultValues: {
      nome: divisao?.nome ?? "",
      foco: divisao?.foco ?? "",
      dias_semana: divisao?.dias_semana ?? [],
    },
  });

  async function onSubmit(values: DivisaoInput) {
    setSalvando(true);
    const res = divisao
      ? await atualizarDivisao(divisao.id, alunoId, values)
      : await criarDivisao(treinoId, alunoId, values, ordem);
    setSalvando(false);
    if (res.ok) {
      toast.success(divisao ? "Divisão atualizada." : "Divisão criada.");
      setAberto(false);
      if (!divisao) reset();
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={gatilho as React.ReactElement} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{divisao ? "Editar divisão" : "Nova divisão"}</DialogTitle>
          <DialogDescription>Ex.: A — Superior, B — Inferior.</DialogDescription>
        </DialogHeader>

        <form id="form-divisao" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <CampoForm label="Nome" htmlFor="div-nome" obrigatorio erro={errors.nome?.message}>
            <Input id="div-nome" {...register("nome")} placeholder="Ex.: A" />
          </CampoForm>
          <CampoForm label="Foco" htmlFor="div-foco" erro={errors.foco?.message}>
            <Input id="div-foco" {...register("foco")} placeholder="Ex.: Superior (opcional)" />
          </CampoForm>
          <CampoForm
            label="Dias da semana"
            dica="Quando este treino acontece. O aluno vê o “treino de hoje” por aqui."
            erro={errors.dias_semana?.message}
          >
            <Controller
              control={control}
              name="dias_semana"
              render={({ field }) => (
                <SeletorDiasSemana
                  value={field.value ?? []}
                  onChange={field.onChange}
                />
              )}
            />
          </CampoForm>
        </form>

        <DialogFooter>
          <Button type="submit" form="form-divisao" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===========================================================================
// Dialog: exercício dentro de uma divisão (prescrição)
// ===========================================================================
function ExercicioDivisaoDialog({
  alunoId,
  divisaoId,
  exercicios,
  item,
  ordem,
  gatilho,
}: {
  alunoId: string;
  divisaoId: string;
  exercicios: Exercicio[];
  item?: TreinoExercicio;
  ordem: number;
  gatilho: React.ReactNode;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof treinoExercicioSchema>, unknown, TreinoExercicioInput>({
    resolver: zodResolver(treinoExercicioSchema),
    defaultValues: {
      exercicio_id: item?.exercicio_id ?? "",
      series: item?.series ?? undefined,
      repeticoes: item?.repeticoes ?? "",
      carga: item?.carga ?? "",
      descanso: item?.descanso ?? "",
      observacao: item?.observacao ?? "",
    },
  });

  async function onSubmit(values: TreinoExercicioInput) {
    setSalvando(true);
    const res = item
      ? await atualizarTreinoExercicio(item.id, alunoId, values)
      : await adicionarTreinoExercicio(divisaoId, alunoId, values, ordem);
    setSalvando(false);
    if (res.ok) {
      toast.success(item ? "Exercício atualizado." : "Exercício adicionado.");
      setAberto(false);
      if (!item) reset();
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  const itemsSelect = Object.fromEntries(exercicios.map((e) => [e.id, e.nome]));

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={gatilho as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Editar exercício" : "Adicionar exercício"}</DialogTitle>
          <DialogDescription>Séries, repetições, carga e descanso.</DialogDescription>
        </DialogHeader>

        <form id="form-te" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <CampoForm label="Exercício" obrigatorio erro={errors.exercicio_id?.message}>
            <Controller
              control={control}
              name="exercicio_id"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={(v) => field.onChange(v ?? "")}
                  items={itemsSelect}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um exercício" />
                  </SelectTrigger>
                  <SelectContent>
                    {exercicios.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </CampoForm>

          <div className="grid gap-4 sm:grid-cols-2">
            <CampoForm label="Séries" htmlFor="te-series" erro={errors.series?.message}>
              <Input id="te-series" type="number" min="1" {...register("series")} placeholder="Ex.: 3" />
            </CampoForm>
            <CampoForm label="Repetições" htmlFor="te-reps" erro={errors.repeticoes?.message}>
              <Input id="te-reps" {...register("repeticoes")} placeholder="Ex.: 10-12" />
            </CampoForm>
            <CampoForm label="Carga" htmlFor="te-carga" erro={errors.carga?.message}>
              <Input id="te-carga" {...register("carga")} placeholder="Ex.: 20 kg" />
            </CampoForm>
            <CampoForm label="Descanso" htmlFor="te-descanso" erro={errors.descanso?.message}>
              <Input id="te-descanso" {...register("descanso")} placeholder="Ex.: 60s" />
            </CampoForm>
          </div>

          <CampoForm label="Observação" htmlFor="te-obs" erro={errors.observacao?.message}>
            <Textarea id="te-obs" rows={2} {...register("observacao")} placeholder="Opcional" />
          </CampoForm>
        </form>

        <DialogFooter>
          <Button type="submit" form="form-te" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===========================================================================
// Bloco de uma divisão (tabela de exercícios)
// ===========================================================================
function DivisaoBloco({
  alunoId,
  divisao,
  exercicios,
}: {
  alunoId: string;
  divisao: DivisaoComExercicios;
  exercicios: Exercicio[];
}) {
  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between gap-2 border-b bg-secondary/40 px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {divisao.nome}
            {divisao.foco ? (
              <span className="ml-2 font-normal text-muted-foreground">
                {divisao.foco}
              </span>
            ) : null}
          </p>
          <p className="text-xs text-muted-foreground">
            {divisao.dias_semana.length
              ? divisao.dias_semana
                  .map((d) => DIAS_SEMANA_CURTO[d])
                  .join(" · ")
              : "Sem dias definidos"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ExercicioDivisaoDialog
            alunoId={alunoId}
            divisaoId={divisao.id}
            exercicios={exercicios}
            ordem={divisao.exercicios.length}
            gatilho={
              <Button variant="outline" size="sm" disabled={exercicios.length === 0}>
                <Plus className="size-3.5" />
                Exercício
              </Button>
            }
          />
          <DivisaoDialog
            alunoId={alunoId}
            treinoId={divisao.treino_id}
            divisao={divisao}
            ordem={divisao.ordem}
            gatilho={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Editar divisão"
                className="text-muted-foreground"
              >
                <Pencil className="size-3.5" />
              </Button>
            }
          />
          <BotaoExcluir
            onConfirm={() => excluirDivisao(divisao.id, alunoId)}
            titulo="Excluir divisão"
            descricao={`Remover a divisão "${divisao.nome}" e todos os seus exercícios?`}
            sucessoMsg="Divisão excluída."
          />
        </div>
      </div>

      {divisao.exercicios.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">
          {exercicios.length === 0
            ? "Cadastre exercícios na biblioteca para adicioná-los aqui."
            : "Nenhum exercício nesta divisão. Use “Exercício” para adicionar."}
        </p>
      ) : (
        <div className="p-3 sm:p-0">
          <TabelaResponsiva
            dados={divisao.exercicios}
            getKey={(ex) => ex.id}
            colunas={[
              {
                cabecalho: "Exercício",
                principal: true,
                celula: (ex) => (
                  <div className="flex items-center gap-2.5">
                    <MidiaThumb
                      url={ex.exercicio?.midia_url}
                      nome={ex.exercicio?.nome ?? "exercício"}
                      tamanho="sm"
                    />
                    <div className="min-w-0">
                      <span className="font-medium">
                        {ex.exercicio?.nome ?? "—"}
                      </span>
                      {ex.observacao ? (
                        <span className="block text-xs text-muted-foreground">
                          {ex.observacao}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ),
              },
              { cabecalho: "Séries", celula: (ex) => ex.series ?? "—" },
              { cabecalho: "Reps", celula: (ex) => ex.repeticoes ?? "—" },
              { cabecalho: "Carga", celula: (ex) => ex.carga ?? "—" },
              { cabecalho: "Descanso", celula: (ex) => ex.descanso ?? "—" },
              {
                cabecalho: "Ações",
                alinhar: "right",
                semRotuloMobile: true,
                celula: (ex) => (
                  <div className="flex justify-end gap-1">
                    <ExercicioDivisaoDialog
                      alunoId={alunoId}
                      divisaoId={divisao.id}
                      exercicios={exercicios}
                      item={ex}
                      ordem={ex.ordem}
                      gatilho={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Editar exercício"
                          className="text-muted-foreground"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      }
                    />
                    <BotaoExcluir
                      onConfirm={() => removerTreinoExercicio(ex.id, alunoId)}
                      titulo="Remover exercício"
                      descricao={`Remover "${ex.exercicio?.nome ?? "exercício"}" desta divisão?`}
                      sucessoMsg="Exercício removido."
                    />
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Card de uma ficha (com suas divisões)
// ===========================================================================
function FichaCard({
  alunoId,
  ficha,
  exercicios,
}: {
  alunoId: string;
  ficha: TreinoComTudo;
  exercicios: Exercicio[];
}) {
  return (
    <Card className="gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-base font-semibold">{ficha.nome}</h3>
            <StatusBadge tom={ficha.ativo ? "sucesso" : "neutro"}>
              {ficha.ativo ? "Ativa" : "Inativa"}
            </StatusBadge>
          </div>
          {ficha.objetivo ? (
            <p className="mt-1 text-sm text-muted-foreground">{ficha.objetivo}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <FichaDialog
            alunoId={alunoId}
            ficha={ficha}
            gatilho={
              <Button variant="ghost" size="icon-sm" aria-label="Editar ficha" className="text-muted-foreground">
                <Pencil className="size-3.5" />
              </Button>
            }
          />
          <BotaoExcluir
            onConfirm={() => excluirTreino(ficha.id, alunoId)}
            titulo="Excluir ficha"
            descricao={`Excluir a ficha "${ficha.nome}" com todas as divisões e exercícios?`}
            sucessoMsg="Ficha excluída."
          />
        </div>
      </div>

      <div className="space-y-3">
        {ficha.divisoes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma divisão ainda. Adicione o Treino A, B, C…
          </p>
        ) : (
          ficha.divisoes.map((d) => (
            <DivisaoBloco
              key={d.id}
              alunoId={alunoId}
              divisao={d}
              exercicios={exercicios}
            />
          ))
        )}

        <DivisaoDialog
          alunoId={alunoId}
          treinoId={ficha.id}
          ordem={ficha.divisoes.length}
          gatilho={
            <Button variant="outline" size="sm">
              <Layers className="size-3.5" />
              Adicionar divisão
            </Button>
          }
        />
      </div>
    </Card>
  );
}

// ===========================================================================
// Editor de fichas de treino do aluno
// ===========================================================================
export function TreinosEditor({
  alunoId,
  treinos,
  exercicios,
}: {
  alunoId: string;
  treinos: TreinoComTudo[];
  exercicios: Exercicio[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <AplicarTemplate alunoId={alunoId} />
        <FichaDialog
          alunoId={alunoId}
          gatilho={
            <Button>
              <Plus className="size-4" />
              Nova ficha
            </Button>
          }
        />
      </div>

      {treinos.length === 0 ? (
        <PageEmpty
          icone={Dumbbell}
          titulo="Sem fichas de treino"
          descricao="Crie uma ficha para montar as divisões (A/B/C) e prescrever os exercícios."
        />
      ) : (
        <div className="space-y-4">
          {treinos.map((t) => (
            <FichaCard
              key={t.id}
              alunoId={alunoId}
              ficha={t}
              exercicios={exercicios}
            />
          ))}
        </div>
      )}

      {exercicios.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Dica: a biblioteca de exercícios está vazia. Cadastre exercícios em
          “Treinos” para poder adicioná-los às divisões.
        </p>
      ) : null}
    </div>
  );
}
