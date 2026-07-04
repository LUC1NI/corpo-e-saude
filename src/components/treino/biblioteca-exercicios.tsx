"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Dumbbell, Pencil, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { CampoForm } from "@/components/ui-extra/campo-form";
import { InputSugestoes } from "@/components/ui-extra/input-sugestoes";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { TabelaResponsiva } from "@/components/ui-extra/tabela-responsiva";
import { BotaoExcluir } from "@/components/treino/botao-excluir";
import { MidiaThumb } from "@/components/treino/midia-thumb";
import {
  atualizarExercicio,
  criarExercicio,
  excluirExercicio,
} from "@/lib/acoes-treino";
import { exercicioSchema, type ExercicioInput } from "@/lib/schemas";
import { EQUIPAMENTOS, GRUPOS_MUSCULARES, type Exercicio } from "@/lib/tipos";

function ExercicioDialog({
  exercicio,
  gatilho,
}: {
  exercicio?: Exercicio;
  gatilho: React.ReactNode;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof exercicioSchema>, unknown, ExercicioInput>({
    resolver: zodResolver(exercicioSchema),
    defaultValues: {
      nome: exercicio?.nome ?? "",
      grupo_muscular: exercicio?.grupo_muscular ?? "",
      equipamento: exercicio?.equipamento ?? "",
      descricao: exercicio?.descricao ?? "",
      midia_url: exercicio?.midia_url ?? "",
    },
  });

  async function onSubmit(values: ExercicioInput) {
    setSalvando(true);
    const res = exercicio
      ? await atualizarExercicio(exercicio.id, values)
      : await criarExercicio(values);
    setSalvando(false);
    if (res.ok) {
      toast.success(exercicio ? "Exercício atualizado." : "Exercício criado.");
      setAberto(false);
      if (!exercicio) reset();
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
          <DialogTitle>
            {exercicio ? "Editar exercício" : "Novo exercício"}
          </DialogTitle>
          <DialogDescription>
            Itens da biblioteca usados na prescrição das fichas.
          </DialogDescription>
        </DialogHeader>

        <form
          id="form-exercicio"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <CampoForm
            label="Nome"
            htmlFor="nome"
            obrigatorio
            erro={errors.nome?.message}
          >
            <Input id="nome" {...register("nome")} placeholder="Ex.: Supino reto" />
          </CampoForm>

          <div className="grid gap-4 sm:grid-cols-2">
            <CampoForm
              label="Grupo muscular"
              htmlFor="grupo_muscular"
              erro={errors.grupo_muscular?.message}
            >
              <InputSugestoes
                id="grupo_muscular"
                listId="dl-grupos"
                opcoes={GRUPOS_MUSCULARES}
                {...register("grupo_muscular")}
                placeholder="Escolha ou digite"
              />
            </CampoForm>
            <CampoForm
              label="Equipamento"
              htmlFor="equipamento"
              erro={errors.equipamento?.message}
            >
              <InputSugestoes
                id="equipamento"
                listId="dl-equip"
                opcoes={EQUIPAMENTOS}
                {...register("equipamento")}
                placeholder="Escolha ou digite"
              />
            </CampoForm>
          </div>

          <CampoForm
            label="Mídia (URL)"
            htmlFor="midia_url"
            dica="Link de vídeo ou imagem de demonstração (opcional)."
            erro={errors.midia_url?.message}
          >
            <Input
              id="midia_url"
              {...register("midia_url")}
              placeholder="https://…"
            />
          </CampoForm>

          <CampoForm
            label="Descrição"
            htmlFor="descricao"
            erro={errors.descricao?.message}
          >
            <Textarea
              id="descricao"
              rows={2}
              {...register("descricao")}
              placeholder="Execução, observações (opcional)"
            />
          </CampoForm>
        </form>

        <DialogFooter>
          <Button
            type="submit"
            form="form-exercicio"
            loading={salvando}
          >
            {salvando ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BibliotecaExercicios({
  exercicios,
}: {
  exercicios: Exercicio[];
}) {
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return exercicios;
    return exercicios.filter(
      (e) =>
        e.nome.toLowerCase().includes(t) ||
        (e.grupo_muscular ?? "").toLowerCase().includes(t) ||
        (e.equipamento ?? "").toLowerCase().includes(t),
    );
  }, [busca, exercicios]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar exercício…"
            className="pl-8"
          />
        </div>
        <ExercicioDialog
          gatilho={
            <Button>
              <Plus className="size-4" />
              Novo exercício
            </Button>
          }
        />
      </div>

      {exercicios.length === 0 ? (
        <PageEmpty
          icone={Dumbbell}
          titulo="Biblioteca vazia"
          descricao="Cadastre exercícios para montar as fichas dos alunos."
        />
      ) : filtrados.length === 0 ? (
        <PageEmpty
          icone={Search}
          titulo="Nenhum resultado"
          descricao="Nenhum exercício corresponde à busca."
        />
      ) : (
        <Card className="overflow-hidden p-0 sm:p-0">
          <div className="p-3 sm:p-0">
            <TabelaResponsiva
              dados={filtrados}
              getKey={(e) => e.id}
              colunas={[
                {
                  cabecalho: "Exercício",
                  principal: true,
                  celula: (e) => (
                    <div className="flex items-center gap-2.5">
                      {e.midia_url ? (
                        <MidiaThumb url={e.midia_url} nome={e.nome} tamanho="sm" />
                      ) : null}
                      <span className="font-medium">{e.nome}</span>
                    </div>
                  ),
                },
                {
                  cabecalho: "Grupo muscular",
                  celula: (e) => e.grupo_muscular ?? "-",
                },
                {
                  cabecalho: "Equipamento",
                  celula: (e) => e.equipamento ?? "-",
                },
                {
                  cabecalho: "Ações",
                  alinhar: "right",
                  semRotuloMobile: true,
                  celula: (e) => (
                    <div className="flex justify-end gap-1">
                      <ExercicioDialog
                        exercicio={e}
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
                        onConfirm={() => excluirExercicio(e.id)}
                        titulo="Excluir exercício"
                        descricao={`Remover "${e.nome}" da biblioteca? Exercícios em uso em alguma ficha não podem ser excluídos.`}
                        sucessoMsg="Exercício excluído."
                      />
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
