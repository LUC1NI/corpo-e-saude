"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Dumbbell, Layers, Pencil, Plus, Sparkles } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CampoForm } from "@/components/ui-extra/campo-form";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { StatusBadge } from "@/components/ui-extra/status-badge";
import { TabelaResponsiva } from "@/components/ui-extra/tabela-responsiva";
import { InputSugestoes } from "@/components/ui-extra/input-sugestoes";
import { BotaoExcluir } from "@/components/treino/botao-excluir";
import { MidiaThumb } from "@/components/treino/midia-thumb";
import { SeletorDiasSemana } from "@/components/treino/seletor-dias";
import {
  adicionarTreinoExercicio,
  aplicarModeloAoAluno,
  atualizarDivisao,
  atualizarTreino,
  atualizarTreinoExercicio,
  criarDivisao,
  criarExercicio,
  criarModeloTreino,
  criarTreino,
  criarTreinoRapido,
  excluirDivisao,
  excluirTreino,
  removerTreinoExercicio,
} from "@/lib/acoes-treino";
import {
  divisaoSchema,
  treinoSchema,
  type DivisaoInput,
  type TreinoExercicioInput,
  type TreinoInput,
} from "@/lib/schemas";
import {
  CARGA_OPCOES,
  DESCANSO_OPCOES,
  DIAS_SEMANA_CURTO,
  FOCOS_DIVISAO,
  NOMES_DIVISAO,
  REPETICOES_OPCOES,
} from "@/lib/tipos";
import type {
  DivisaoComExercicios,
  Exercicio,
  Treino,
  TreinoComTudo,
  TreinoDivisao,
  TreinoExercicio,
} from "@/lib/tipos";

// ===========================================================================
// Dialog: ficha de treino (do aluno) ou treino-modelo (alunoId null)
// ===========================================================================
function FichaDialog({
  alunoId,
  ficha,
  gatilho,
}: {
  /** null = treino-modelo reutilizável (aba Treinos). */
  alunoId: string | null;
  ficha?: Treino;
  gatilho: React.ReactNode;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const ehModelo = alunoId === null;

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
      : ehModelo
        ? await criarModeloTreino(values)
        : await criarTreino(alunoId, values);
    setSalvando(false);
    if (res.ok) {
      toast.success(ficha ? "Treino atualizado." : "Treino criado.");
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
          <DialogTitle>
            {ficha
              ? ehModelo
                ? "Editar treino"
                : "Editar ficha"
              : ehModelo
                ? "Novo treino"
                : "Nova ficha"}
          </DialogTitle>
          <DialogDescription>
            {ehModelo
              ? "Treino reutilizável: monte uma vez e aplique a qualquer aluno."
              : "Cada ficha agrupa os dias de treino (A, B, C…) do aluno."}
          </DialogDescription>
        </DialogHeader>

        <form id="form-ficha" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <CampoForm label="Nome" htmlFor="ficha-nome" obrigatorio erro={errors.nome?.message}>
            <Input
              id="ficha-nome"
              {...register("nome")}
              placeholder="Ex.: Hipertrofia 2026"
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
          <Button type="submit" form="form-ficha" loading={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===========================================================================
// Dialog: divisão (A/B/C) — um "dia de treino" dentro da ficha
// ===========================================================================
function DivisaoDialog({
  alunoId,
  treinoId,
  divisao,
  ordem,
  gatilho,
}: {
  alunoId: string | null;
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
          <DialogTitle>
            {divisao ? "Editar dia de treino" : "Novo dia de treino"}
          </DialogTitle>
          <DialogDescription>
            Cada divisão é um dia de treino. Ex.: A: Peito/Tríceps, B:
            Costas/Bíceps, C: Pernas.
          </DialogDescription>
        </DialogHeader>

        <form id="form-divisao" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <CampoForm label="Nome" htmlFor="div-nome" obrigatorio erro={errors.nome?.message}>
            <InputSugestoes
              id="div-nome"
              listId="dl-div-nome"
              opcoes={NOMES_DIVISAO}
              {...register("nome")}
              placeholder="Ex.: A"
            />
          </CampoForm>
          <CampoForm label="Foco" htmlFor="div-foco" erro={errors.foco?.message}>
            <InputSugestoes
              id="div-foco"
              listId="dl-div-foco"
              opcoes={FOCOS_DIVISAO}
              {...register("foco")}
              placeholder="Escolha ou digite (opcional)"
            />
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
          <Button type="submit" form="form-divisao" loading={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===========================================================================
// Dialog: exercício dentro de uma divisão (prescrição)
//
// O campo "Exercício" é uma busca livre: escolha um da biblioteca ou digite
// um nome novo — ele é criado na biblioteca automaticamente ao salvar.
// "Salvar e adicionar outro" permite montar a ficha inteira sem fechar.
// ===========================================================================
function ExercicioDivisaoDialog({
  alunoId,
  divisaoId,
  exercicios,
  item,
  ordem,
  gatilho,
}: {
  alunoId: string | null;
  divisaoId: string;
  exercicios: Exercicio[];
  item?: TreinoExercicio;
  ordem: number;
  gatilho: React.ReactNode;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  // Quantos já foram adicionados nesta sessão do diálogo — mantém a ordem
  // correta ao usar "Salvar e adicionar outro".
  const [adicionados, setAdicionados] = useState(0);

  const nomeInicial = item
    ? (exercicios.find((e) => e.id === item.exercicio_id)?.nome ?? "")
    : "";
  const [nomeEx, setNomeEx] = useState(nomeInicial);
  const [series, setSeries] = useState(
    item?.series != null ? String(item.series) : "",
  );
  const [repeticoes, setRepeticoes] = useState(item?.repeticoes ?? "");
  const [carga, setCarga] = useState(item?.carga ?? "");
  const [descanso, setDescanso] = useState(item?.descanso ?? "");
  const [observacao, setObservacao] = useState(item?.observacao ?? "");

  function limparCampos() {
    setNomeEx("");
    setSeries("");
    setRepeticoes("");
    setCarga("");
    setDescanso("");
    setObservacao("");
  }

  async function salvar(continuar: boolean) {
    const nome = nomeEx.trim();
    if (!nome) {
      toast.error("Informe o exercício.");
      return;
    }

    setSalvando(true);

    // Resolve o exercício pelo nome; se não existir, cria na biblioteca.
    let exercicioId = exercicios.find(
      (e) => e.nome.toLowerCase() === nome.toLowerCase(),
    )?.id;
    let criouNovo = false;
    if (!exercicioId) {
      const resEx = await criarExercicio({ nome });
      if (!resEx.ok || !resEx.dados) {
        setSalvando(false);
        toast.error(
          resEx.ok ? "Não foi possível criar o exercício." : resEx.erro,
        );
        return;
      }
      exercicioId = resEx.dados.id;
      criouNovo = true;
    }

    const valores: TreinoExercicioInput = {
      exercicio_id: exercicioId,
      series: series === "" ? undefined : Number(series),
      repeticoes: repeticoes || undefined,
      carga: carga || undefined,
      descanso: descanso || undefined,
      observacao: observacao || undefined,
    };

    const res = item
      ? await atualizarTreinoExercicio(item.id, alunoId, valores)
      : await adicionarTreinoExercicio(
          divisaoId,
          alunoId,
          valores,
          ordem + adicionados,
        );
    setSalvando(false);

    if (!res.ok) {
      toast.error(res.erro);
      return;
    }

    toast.success(
      item
        ? "Exercício atualizado."
        : criouNovo
          ? `"${nome}" criado na biblioteca e adicionado.`
          : "Exercício adicionado.",
    );
    router.refresh();

    if (continuar && !item) {
      setAdicionados((n) => n + 1);
      limparCampos();
    } else {
      setAberto(false);
    }
  }

  const dlExercicios = `dl-ex-${divisaoId}${item ? `-${item.id}` : ""}`;

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        setAberto(v);
        if (v) {
          setAdicionados(0);
          if (!item) limparCampos();
        }
      }}
    >
      <DialogTrigger render={gatilho as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {item ? "Editar exercício" : "Adicionar exercício"}
          </DialogTitle>
          <DialogDescription>
            Busque na biblioteca ou digite um nome novo: ele é criado
            automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form
          id="form-te"
          onSubmit={(e) => {
            e.preventDefault();
            void salvar(false);
          }}
          className="space-y-4"
        >
          <CampoForm
            label="Exercício"
            htmlFor="te-nome"
            obrigatorio
            dica="Digite para buscar; um nome novo entra na biblioteca ao salvar."
          >
            <Input
              id="te-nome"
              list={dlExercicios}
              value={nomeEx}
              onChange={(e) => setNomeEx(e.target.value)}
              placeholder="Ex.: Supino reto"
              autoComplete="off"
            />
            <datalist id={dlExercicios}>
              {exercicios.map((e) => (
                <option
                  key={e.id}
                  value={e.nome}
                  label={e.grupo_muscular ?? undefined}
                />
              ))}
            </datalist>
          </CampoForm>

          <div className="grid gap-4 sm:grid-cols-2">
            <CampoForm label="Séries" htmlFor="te-series">
              <Input
                id="te-series"
                type="number"
                min="1"
                value={series}
                onChange={(e) => setSeries(e.target.value)}
                placeholder="Ex.: 3"
              />
            </CampoForm>
            <CampoForm label="Repetições" htmlFor="te-reps">
              <InputSugestoes
                id="te-reps"
                listId="dl-reps"
                opcoes={REPETICOES_OPCOES}
                value={repeticoes}
                onChange={(e) => setRepeticoes(e.target.value)}
                placeholder="Ex.: 10-12"
              />
            </CampoForm>
            <CampoForm label="Carga" htmlFor="te-carga">
              <InputSugestoes
                id="te-carga"
                listId="dl-carga"
                opcoes={CARGA_OPCOES}
                value={carga}
                onChange={(e) => setCarga(e.target.value)}
                placeholder="Ex.: 20 kg"
              />
            </CampoForm>
            <CampoForm label="Descanso" htmlFor="te-descanso">
              <InputSugestoes
                id="te-descanso"
                listId="dl-descanso"
                opcoes={DESCANSO_OPCOES}
                value={descanso}
                onChange={(e) => setDescanso(e.target.value)}
                placeholder="Ex.: 60s"
              />
            </CampoForm>
          </div>

          <CampoForm label="Observação" htmlFor="te-obs">
            <Textarea
              id="te-obs"
              rows={2}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Opcional"
            />
          </CampoForm>
        </form>

        <DialogFooter>
          {!item ? (
            <Button
              type="button"
              variant="outline"
              disabled={salvando}
              onClick={() => void salvar(true)}
            >
              Salvar e adicionar outro
            </Button>
          ) : null}
          <Button type="submit" form="form-te" loading={salvando}>
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
  alunoId: string | null;
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
              <Button variant="outline" size="sm">
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
          Nenhum exercício nesta divisão. Use “Exercício” para adicionar: dá
          para buscar na biblioteca ou digitar um novo na hora.
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
                        {ex.exercicio?.nome ?? "-"}
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
              { cabecalho: "Séries", celula: (ex) => ex.series ?? "-" },
              { cabecalho: "Reps", celula: (ex) => ex.repeticoes ?? "-" },
              { cabecalho: "Carga", celula: (ex) => ex.carga ?? "-" },
              { cabecalho: "Descanso", celula: (ex) => ex.descanso ?? "-" },
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
  alunoId: string | null;
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
// Atalho: cria ficha + divisão A em um clique (professor só adiciona
// exercícios depois — sem passar por dois diálogos).
// ===========================================================================
function MontarTreinoButton({ alunoId }: { alunoId: string }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);

  async function montar() {
    setCarregando(true);
    const res = await criarTreinoRapido(alunoId);
    setCarregando(false);
    if (res.ok) {
      toast.success("Ficha criada com o dia A. Agora adicione os exercícios.");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={montar}
      loading={carregando}
    >
      <Plus className="size-4" />
      {carregando ? "Criando…" : "Montar do zero"}
    </Button>
  );
}

// ===========================================================================
// Dialog: aplicar um treino pronto (modelo) ao aluno. A aplicação copia
// divisões e exercícios — depois é só ajustar um exercício ou outro.
// ===========================================================================
function AplicarModeloDialog({
  alunoId,
  modelos,
}: {
  alunoId: string;
  modelos: TreinoComTudo[];
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [aplicando, setAplicando] = useState<string | null>(null);

  async function aplicar(id: string) {
    setAplicando(id);
    const res = await aplicarModeloAoAluno(id, alunoId);
    setAplicando(null);
    if (res.ok) {
      toast.success("Treino aplicado. Ajuste o que quiser.");
      setAberto(false);
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger
        render={
          <Button>
            <Sparkles className="size-4" />
            Usar treino pronto
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Treinos prontos</DialogTitle>
          <DialogDescription>
            Aplica uma cópia do treino a este aluno. Depois é só ajustar um
            exercício ou outro.
          </DialogDescription>
        </DialogHeader>

        {modelos.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            Você ainda não montou nenhum treino. Monte seus treinos
            reutilizáveis na aba <strong>Treinos</strong> e aplique-os aqui.
          </p>
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {modelos.map((m) => {
              const nEx = m.divisoes.reduce(
                (s, d) => s + d.exercicios.length,
                0,
              );
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{m.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.divisoes.length > 0
                        ? `${m.divisoes.map((d) => d.nome).join(" · ")} · ${nEx} exercício(s)`
                        : "Sem divisões ainda"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={aplicando !== null}
                    loading={aplicando === m.id}
                    onClick={() => aplicar(m.id)}
                  >
                    Aplicar
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ===========================================================================
// Editor de treinos — usado em dois contextos:
//   - página do aluno (alunoId string): fichas do aluno + aplicar modelos;
//   - página de um treino-modelo (alunoId null): edita o modelo.
// ===========================================================================
export function TreinosEditor({
  alunoId,
  treinos,
  exercicios,
  modelos = [],
}: {
  /** null = editando um treino-modelo (aba Treinos). */
  alunoId: string | null;
  treinos: TreinoComTudo[];
  exercicios: Exercicio[];
  /** Treinos prontos para aplicar (usado apenas no modo aluno). */
  modelos?: TreinoComTudo[];
}) {
  const modoModelo = alunoId === null;

  return (
    <div className="space-y-4">
      {!modoModelo && treinos.length > 0 ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <AplicarModeloDialog alunoId={alunoId} modelos={modelos} />
          <FichaDialog
            alunoId={alunoId}
            gatilho={
              <Button variant="outline">
                <Plus className="size-4" />
                Nova ficha
              </Button>
            }
          />
        </div>
      ) : null}

      {treinos.length === 0 ? (
        modoModelo ? (
          <PageEmpty
            icone={Dumbbell}
            titulo="Treino não encontrado"
            descricao="Este treino pode ter sido excluído."
          />
        ) : (
          <PageEmpty
            icone={Dumbbell}
            titulo="Este aluno ainda não tem treino"
            descricao="Aplique um treino pronto e ajuste o que quiser, ou monte do zero."
            acao={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <AplicarModeloDialog alunoId={alunoId} modelos={modelos} />
                <MontarTreinoButton alunoId={alunoId} />
              </div>
            }
          />
        )
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

    </div>
  );
}
