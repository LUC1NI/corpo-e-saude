import { CheckCircle2, Dumbbell, History, Info } from "lucide-react";

import { ExecucoesLista } from "@/components/treino/execucoes-lista";
import { TreinoDoAluno } from "@/components/treino/treino-do-aluno";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { requireUsuario } from "@/lib/auth";
import { getAlunoAtual } from "@/lib/aluno";
import { hojeISO } from "@/lib/financeiro";
import { getExecucoesDoAluno, getTreinosDoAluno } from "@/lib/treino";
import { diaDaSemanaHoje } from "@/lib/treino-utils";
import type { TreinoComTudo, TreinoExecucao } from "@/lib/tipos";

export default async function AlunoTreinoPage() {
  await requireUsuario(["aluno"]);

  const aluno = await getAlunoAtual();
  const online = aluno?.tipo === "online";

  // Regra: quem tem ficha ativa pode usar o MODO TREINO, presencial ou
  // online. O presencial viajando (ou treinando por fora) faz o treino que
  // o professor passou pelo app e o professor recebe o retorno igual.
  let ativos: TreinoComTudo[] = [];
  let execucoes: TreinoExecucao[] = [];
  if (aluno) {
    const [todos, execs] = await Promise.all([
      getTreinosDoAluno(aluno.id),
      getExecucoesDoAluno(aluno.id),
    ]);
    ativos = todos.filter((t) => t.ativo);
    execucoes = execs;
  }
  const principal = ativos[0] ?? null;
  const diaHoje = diaDaSemanaHoje();
  const hoje = hojeISO();
  const concluidoHoje = execucoes.some((e) =>
    e.finalizado_em.startsWith(hoje),
  );

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-xl font-bold">Seu treino</h1>

      {concluidoHoje ? (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
            <CheckCircle2 className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-800">
              Treino de hoje concluído 🎉
            </p>
            <p className="text-xs text-emerald-700/80">
              Seu professor já recebeu o retorno. Você pode treinar de novo ou
              rever o histórico abaixo.
            </p>
          </div>
        </div>
      ) : null}

      {!principal ? (
        online ? (
          <PageEmpty
            icone={Dumbbell}
            titulo="Nenhum treino ativo"
            descricao="Quando seu professor montar a ficha, ela aparece aqui com os exercícios e as demonstrações."
          />
        ) : (
          // Presencial: prescrever no app é opcional. Sem ficha, mostra uma
          // mensagem acolhedora — o treino acontece na aula, com o professor.
          <div className="flex flex-col items-center gap-3 rounded-2xl border bg-gradient-to-b from-primary/[0.04] to-transparent p-8 text-center">
            <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Dumbbell className="size-7" />
            </span>
            <div className="space-y-1">
              <p className="font-heading text-lg font-bold">
                Seu treino é no estúdio 💪
              </p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Seu professor preparou o melhor treino pra você nesta aula. É só
                chegar no seu horário que ele conduz tudo pessoalmente.
              </p>
            </div>
          </div>
        )
      ) : (
        <>
          {!online ? (
            <div className="flex items-start gap-3 rounded-2xl border bg-secondary/40 p-4">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Info className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  Treino prescrito pelo seu professor
                </p>
                <p className="text-xs text-muted-foreground">
                  Na aula, seu professor conduz tudo. Viajando ou treinando por
                  conta? Toque em Iniciar treino e registre: ele recebe o
                  retorno.
                </p>
              </div>
            </div>
          ) : (
            <p className="-mt-2 text-sm text-muted-foreground">
              {principal.nome}
            </p>
          )}
          <TreinoDoAluno
            treino={principal}
            diaHoje={diaHoje}
            permitirIniciar
          />
        </>
      )}

      {/* Histórico: o que o aluno já treinou e registrou pelo app. */}
      {execucoes.length > 0 ? (
        <section className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <History className="size-4 text-muted-foreground" />
            <h2 className="font-heading text-base font-bold">
              Treinos concluídos
            </h2>
          </div>
          <ExecucoesLista execucoes={execucoes} />
        </section>
      ) : null}
    </div>
  );
}
