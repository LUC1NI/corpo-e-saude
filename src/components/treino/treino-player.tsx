"use client";

import { Check, ChevronLeft, SkipForward, Timer, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { MidiaThumb } from "@/components/treino/midia-thumb";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { registrarExecucao } from "@/lib/acoes-execucao";
import { SENSACOES, type DivisaoComExercicios } from "@/lib/tipos";
import { apagarRascunho, lerRascunho, salvarRascunho } from "@/lib/treino-rascunho";
import { comRede } from "@/lib/acoes";
import { cn } from "@/lib/utils";

/**
 * Converte o descanso prescrito (texto livre: "60s", "90", "1min30", "2min")
 * em segundos. Número puro até 10 é tratado como minutos ("2" -> 2min);
 * acima disso, como segundos ("45" -> 45s). Sem match: 60s.
 */
export function parseDescansoSegundos(txt: string | null): number {
  if (!txt) return 60;
  const t = txt.toLowerCase();
  const min = t.match(/(\d+)\s*m(?:in)?/);
  if (min) {
    let s = parseInt(min[1]!, 10) * 60;
    const extra = t.match(/m(?:in)?\s*(\d+)/);
    if (extra) s += parseInt(extra[1]!, 10);
    return Math.min(s, 900);
  }
  const num = t.match(/(\d+)/);
  if (!num) return 60;
  const n = parseInt(num[1]!, 10);
  return Math.min(n <= 10 ? n * 60 : n, 900);
}

function fmtTempo(totalSeg: number): string {
  const h = Math.floor(totalSeg / 3600);
  const m = Math.floor((totalSeg % 3600) / 60);
  const s = totalSeg % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function vibrar(padrao: number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(padrao);
  }
}

/**
 * Modo treino: o aluno marca as séries feitas exercício a exercício, com
 * timer de descanso automático (do descanso prescrito) e, ao finalizar,
 * envia o retorno para o professor (sensação + observação).
 */
export function TreinoPlayer({
  divisao,
  aoFechar,
}: {
  divisao: DivisaoComExercicios;
  aoFechar: () => void;
}) {
  const router = useRouter();
  // Retoma o rascunho desta divisão (voltar/recarregar não perde o treino).
  const [rascunho] = useState(() => lerRascunho(divisao.id));
  // Timestamp fixado na montagem (estado para poder ser lido no render).
  const [iniciadoEm] = useState(() => rascunho?.iniciadoEm ?? Date.now());

  const [fase, setFase] = useState<"treinando" | "resumo">("treinando");
  const [feitas, setFeitas] = useState<Record<string, number>>(rascunho?.feitas ?? {});
  const [descansoAte, setDescansoAte] = useState<number | null>(null);
  const [descansoTotal, setDescansoTotal] = useState(60);
  const [agora, setAgora] = useState(() => Date.now());
  const [duracaoFinal, setDuracaoFinal] = useState(0);
  const [sensacao, setSensacao] = useState<
    "facil" | "na_medida" | "dificil" | undefined
  >();
  const [observacao, setObservacao] = useState("");
  // Carga que o aluno realmente usou, por exercício (opcional) — vai para o professor.
  const [cargasUsadas, setCargasUsadas] = useState<Record<string, string>>(rascunho?.cargasUsadas ?? {});
  const [enviando, setEnviando] = useState(false);
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const saindo = useRef(false);

  // Guarda o progresso a cada série/carga anotada.
  useEffect(() => {
    // Sem nenhuma série marcada não há o que guardar.
    if (Object.keys(feitas).length === 0) return;
    salvarRascunho({ divisaoId: divisao.id, iniciadoEm, feitas, cargasUsadas });
  }, [divisao.id, iniciadoEm, feitas, cargasUsadas]);

  // Voltar do Android/navegador pede confirmação em vez de sair do treino.
  useEffect(() => {
    history.pushState({ modoTreino: true }, "");
    const aoVoltar = () => {
      if (saindo.current) return;
      history.pushState({ modoTreino: true }, "");
      setFase("treinando");
      setConfirmarSaida(true);
    };
    window.addEventListener("popstate", aoVoltar);
    return () => window.removeEventListener("popstate", aoVoltar);
  }, []);

  function sair(descartar: boolean) {
    if (descartar) apagarRascunho();
    saindo.current = true;
    history.back(); // tira a entrada extra do histórico
    aoFechar();
  }

  // Relógio único: cronômetro total + contagem do descanso (por timestamp,
  // para não atrasar quando a aba perde o foco). O fim do descanso é
  // detectado aqui mesmo: vibra e libera.
  useEffect(() => {
    if (fase !== "treinando") return;
    const id = setInterval(() => {
      setAgora(Date.now());
      setDescansoAte((ate) => {
        if (ate && Date.now() >= ate) {
          vibrar([200, 100, 200]);
          return null;
        }
        return ate;
      });
    }, 500);
    return () => clearInterval(id);
  }, [fase]);

  // Mantém a tela ligada durante o treino (progressive enhancement).
  useEffect(() => {
    if (fase !== "treinando") return;
    let lock: { release: () => Promise<void> } | null = null;
    let ativo = true;
    async function pedir() {
      try {
        const wl = (
          navigator as Navigator & {
            wakeLock?: {
              request: (t: "screen") => Promise<{
                release: () => Promise<void>;
              }>;
            };
          }
        ).wakeLock;
        if (!wl) return;
        const novo = await wl.request("screen");
        if (ativo) lock = novo;
        else void novo.release();
      } catch {
        // sem suporte/permissão: segue sem wake lock
      }
    }
    void pedir();
    const aoVoltar = () => {
      if (document.visibilityState === "visible") void pedir();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      ativo = false;
      document.removeEventListener("visibilitychange", aoVoltar);
      if (lock) void lock.release();
    };
  }, [fase]);

  const restanteDescanso = descansoAte
    ? Math.max(0, Math.ceil((descansoAte - agora) / 1000))
    : 0;

  const exercicios = divisao.exercicios;
  const totalExercicios = exercicios.length;
  const completos = exercicios.filter(
    (ex) => (feitas[ex.id] ?? 0) >= Math.max(ex.series ?? 1, 1),
  ).length;
  const seriesFeitasTotal = Object.values(feitas).reduce((s, n) => s + n, 0);
  // Exercício "da vez": o primeiro ainda incompleto (guia o olho na lista e
  // aparece como "a seguir" no card de descanso).
  const proximo =
    exercicios.find(
      (ex) => (feitas[ex.id] ?? 0) < Math.max(ex.series ?? 1, 1),
    ) ?? null;
  const duracaoSeg = Math.floor((agora - iniciadoEm) / 1000);

  const marcarSerie = useCallback(
    (exId: string, seriesPrevistas: number, descanso: string | null) => {
      setFeitas((atual) => {
        const feitasEx = atual[exId] ?? 0;
        if (feitasEx >= seriesPrevistas) return atual;
        const novas = { ...atual, [exId]: feitasEx + 1 };

        // Tudo completo? Encerra qualquer descanso e libera o Finalizar.
        const tudoCompleto = exercicios.every(
          (ex) => (novas[ex.id] ?? 0) >= Math.max(ex.series ?? 1, 1),
        );
        if (tudoCompleto) {
          setDescansoAte(null);
        } else {
          const seg = parseDescansoSegundos(descanso);
          setDescansoTotal(seg);
          setDescansoAte(Date.now() + seg * 1000);
        }
        return novas;
      });
      vibrar([40]);
    },
    [exercicios],
  );

  function abrirResumo() {
    setDuracaoFinal(Math.floor((Date.now() - iniciadoEm) / 1000));
    setDescansoAte(null);
    setFase("resumo");
  }

  async function enviar() {
    setEnviando(true);
    const res = await comRede(registrarExecucao({
      divisao_id: divisao.id,
      nome_divisao: divisao.nome,
      foco_divisao: divisao.foco ?? undefined,
      iniciado_em: new Date(iniciadoEm).toISOString(),
      duracao_segundos: duracaoFinal,
      detalhes: exercicios.map((ex) => ({
        nome: ex.exercicio?.nome ?? "Exercício",
        series: ex.series ?? 0,
        series_feitas: feitas[ex.id] ?? 0,
        carga: ex.carga ?? undefined,
        carga_usada: cargasUsadas[ex.id]?.trim() || undefined,
      })),
      sensacao,
      observacao: observacao.trim() || undefined,
    }));
    setEnviando(false);

    if (res.ok) {
      toast.success("Treino registrado! Seu professor recebe o retorno.");
      sair(true);
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  // ---------------------------------------------------------------- resumo
  if (fase === "resumo") {
    return (
      <div role="dialog" aria-modal="true" aria-label="Resumo do treino" className="fixed inset-0 z-50 overflow-y-auto bg-background">
        <div className="mx-auto flex min-h-full w-full max-w-md flex-col p-5">
          <button
            type="button"
            onClick={() => setFase("treinando")}
            className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            Voltar ao treino
          </button>

          <div className="flex flex-1 flex-col justify-center py-8">
            <div className="text-center">
              <span className="inline-flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#033373] to-[#0090D8] text-white shadow-lg">
                <Check className="size-8" strokeWidth={3} />
              </span>
              <h2 className="mt-4 text-2xl font-extrabold tracking-tight">
                Bom treino!
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Treino {divisao.nome}
                {divisao.foco ? ` · ${divisao.foco}` : ""}
              </p>
            </div>

            {/* Números da sessão */}
            <div className="mt-6 grid grid-cols-3 gap-2">
              {[
                { valor: fmtTempo(duracaoFinal), rotulo: "de treino" },
                {
                  valor: `${completos}/${totalExercicios}`,
                  rotulo: "exercícios",
                },
                { valor: String(seriesFeitasTotal), rotulo: "séries feitas" },
              ].map((s) => (
                <div
                  key={s.rotulo}
                  className="rounded-xl border bg-secondary/40 px-2 py-3 text-center"
                >
                  <p className="text-lg font-extrabold tabular-nums">
                    {s.valor}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {s.rotulo}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <p className="text-sm font-semibold">Como foi o treino?</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(
                  Object.entries(SENSACOES) as [
                    keyof typeof SENSACOES,
                    (typeof SENSACOES)[keyof typeof SENSACOES],
                  ][]
                ).map(([chave, s]) => (
                  <button
                    key={chave}
                    type="button"
                    aria-pressed={sensacao === chave}
                    onClick={() =>
                      setSensacao(sensacao === chave ? undefined : chave)
                    }
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border p-3 text-sm font-medium transition-all",
                      sensacao === chave
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "hover:bg-secondary",
                    )}
                  >
                    <span className="text-xl">{s.emoji}</span>
                    {s.rotulo}
                  </button>
                ))}
              </div>

              <p className="mt-5 text-sm font-semibold">
                Recado para o professor{" "}
                <span className="font-normal text-muted-foreground">
                  (opcional)
                </span>
              </p>
              <Textarea
                aria-label="Recado para o professor (opcional)"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex.: aumentei a carga no leg press para 80 kg."
                className="mt-2 min-h-24"
                maxLength={1000}
              />

              <Button
                onClick={enviar}
                loading={enviando}
                className="mt-6 h-12 w-full bg-gradient-to-r from-cta-de to-cta-ate text-sm font-semibold shadow-[0_8px_24px_rgba(0,144,216,0.4)]"
              >
                {enviando ? "Enviando…" : "Enviar para o professor"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------- treinando
  return (
    <div role="dialog" aria-modal="true" aria-label={`Modo treino · ${divisao.foco || `Treino ${divisao.nome}`}`} className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Modo treino ocupa a tela toda: some o menu inferior do app. */}
      <style>{"[data-bottom-nav]{display:none}"}</style>
      {/* Cabeçalho fixo: divisão + cronômetro + sair */}
      <header className="flex items-center gap-3 border-b bg-brand-navy p-4 text-white">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">
          {divisao.nome}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold">
            {divisao.foco || `Treino ${divisao.nome}`}
          </p>
          <p className="text-xs text-white/60">
            {completos}/{totalExercicios} exercícios
          </p>
        </div>
        <span className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 font-mono text-sm font-semibold tabular-nums">
          <Timer className="size-4 text-[#7dd3fc]" />
          {fmtTempo(duracaoSeg)}
        </span>
        <AlertDialog open={confirmarSaida} onOpenChange={setConfirmarSaida}>
          <AlertDialogTrigger
            render={
              <button
                type="button"
                aria-label="Sair do treino"
                className="inline-flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
              />
            }
          >
            <X className="size-5" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sair do treino?</AlertDialogTitle>
              <AlertDialogDescription>
                As séries marcadas ficam guardadas neste aparelho: dá para
                continuar depois. Para enviar ao professor, use Finalizar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Continuar treinando</AlertDialogCancel>
              <AlertDialogAction onClick={() => sair(false)}>Sair</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </header>

      {/* Barra de progresso */}
      <div className="h-1.5 w-full bg-secondary">
        <div
          className="h-full bg-gradient-to-r from-cta-de to-cta-ate transition-all duration-500"
          style={{
            width: `${totalExercicios ? (completos / totalExercicios) * 100 : 0}%`,
          }}
        />
      </div>

      {/* Lista de exercícios */}
      <div className="flex-1 overflow-y-auto">
        <ul className="mx-auto w-full max-w-md space-y-3 p-4 pb-40">
          {exercicios.map((ex) => {
            const previstas = Math.max(ex.series ?? 1, 1);
            const feitasEx = feitas[ex.id] ?? 0;
            const completo = feitasEx >= previstas;
            const ehDaVez = !completo && ex.id === proximo?.id;
            return (
              <li
                key={ex.id}
                className={cn(
                  "rounded-2xl border p-4 transition-all",
                  completo
                    ? "border-emerald-200 bg-emerald-50/60"
                    : ehDaVez
                      ? "border-[#0090D8]/50 bg-card shadow-[0_4px_16px_rgba(0,144,216,0.14)]"
                      : "bg-card",
                )}
              >
                <div className="flex items-start gap-3">
                  <MidiaThumb
                    url={ex.exercicio?.midia_url}
                    nome={ex.exercicio?.nome ?? "exercício"}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "font-semibold",
                        completo && "text-emerald-700",
                      )}
                    >
                      {ex.exercicio?.nome ?? "Exercício"}
                      {ehDaVez ? (
                        <span className="ml-2 inline-flex items-center rounded-full bg-gradient-to-r from-cta-de to-cta-ate px-2 py-0.5 align-middle text-[10px] font-bold text-white uppercase">
                          agora
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {previstas}x{ex.repeticoes ?? "-"}
                      {ex.descanso ? ` · descanso ${ex.descanso}` : ""}
                    </p>
                    {ex.carga ? (
                      <p className="mt-1 inline-flex items-center rounded-md bg-[#0090D8]/10 px-2 py-0.5 text-sm font-bold text-[#0069a8]">
                        Carga: {ex.carga}
                      </p>
                    ) : null}
                    {ex.observacao ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {ex.observacao}
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* No exercício da vez e nos já feitos: anotar/corrigir a carga real (opcional). */}
                {ehDaVez || completo ? (
                  <label className="mt-3 flex items-center gap-2 text-sm">
                    <span className="shrink-0 text-muted-foreground">Carga usada <span className="text-xs">(opcional)</span></span>
                    <input
                      value={cargasUsadas[ex.id] ?? ""}
                      onChange={(e) =>
                        setCargasUsadas((a) => ({ ...a, [ex.id]: e.target.value }))
                      }
                      maxLength={60}
                      inputMode="text"
                      placeholder={ex.carga ? "igual à prescrita" : "ex.: 20 kg"}
                      className="h-11 min-w-0 flex-1 rounded-lg border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
                    />
                  </label>
                ) : null}

                {/* Bolinhas de série + botão de marcar */}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: previstas }).map((_, i) => (
                      <span
                        key={i}
                        className={cn(
                          "size-2.5 rounded-full transition-colors",
                          i < feitasEx
                            ? "bg-gradient-to-r from-cta-de to-cta-ate"
                            : "bg-secondary ring-1 ring-black/10",
                        )}
                      />
                    ))}
                  </div>
                  {completo ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                      <Check className="size-4" strokeWidth={3} />
                      Concluído
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant={ehDaVez ? "default" : "outline"}
                      onClick={() =>
                        marcarSerie(ex.id, previstas, ex.descanso)
                      }
                      className={cn(
                        "px-4 font-semibold",
                        ehDaVez && "bg-gradient-to-r from-cta-de to-cta-ate",
                      )}
                    >
                      <Check className="size-4" strokeWidth={3} />
                      Série feita ({feitasEx + 1}/{previstas})
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Rodapé: descanso ativo OU botão finalizar */}
      <footer className="border-t bg-background/95 p-4 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-md">
          {descansoAte ? (
            <div className="rounded-2xl bg-brand-navy p-4 text-white shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Timer className="size-6 text-[#7dd3fc]" />
                  <div className="leading-tight">
                    <p className="text-xs tracking-wide text-white/60 uppercase">
                      Descanso
                    </p>
                    <p className="font-mono text-2xl font-bold tabular-nums">
                      {fmtTempo(restanteDescanso)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDescansoAte((a) => (a ? a + 30_000 : a))
                    }
                    className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold transition-colors hover:bg-white/20"
                  >
                    +30s
                  </button>
                  <button
                    type="button"
                    onClick={() => setDescansoAte(null)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cta-de to-cta-ate px-3 py-2 text-sm font-semibold transition-all hover:-translate-y-0.5"
                  >
                    <SkipForward className="size-4" />
                    Pular
                  </button>
                </div>
              </div>
              {/* Barra regressiva */}
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#0090D8] to-[#7dd3fc] transition-all duration-500"
                  style={{
                    width: `${descansoTotal ? (restanteDescanso / descansoTotal) * 100 : 0}%`,
                  }}
                />
              </div>
              {proximo ? (
                <p className="mt-2.5 truncate text-xs text-white/70">
                  A seguir:{" "}
                  <span className="font-semibold text-white">
                    {proximo.exercicio?.nome ?? "Exercício"}
                  </span>{" "}
                  · série {(feitas[proximo.id] ?? 0) + 1}/
                  {Math.max(proximo.series ?? 1, 1)}
                </p>
              ) : null}
            </div>
          ) : (
            <Button
              onClick={abrirResumo}
              className="h-12 w-full bg-gradient-to-r from-cta-de to-cta-ate text-sm font-semibold shadow-[0_8px_24px_rgba(0,144,216,0.4)]"
            >
              Finalizar treino ({completos}/{totalExercicios})
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
