import { CheckCircle2, Clock, Dumbbell, History } from "lucide-react";

import { ExecucoesLista } from "@/components/treino/execucoes-lista";
import { TreinoDoAluno } from "@/components/treino/treino-do-aluno";
import Link from "@/components/ui-extra/link";
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

  // Ficha de treino é do aluno ONLINE. O presencial treina na aula, com o
  // professor (o menu dele mostra Horários; aqui só chega pela URL).
  if (aluno?.tipo !== "online") {
    return (
      <div className="space-y-5">
        <h1 className="font-heading text-xl font-bold">Seu treino</h1>
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-gradient-to-b from-primary/[0.04] to-transparent p-8 text-center">
          <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Dumbbell className="size-7" />
          </span>
          <div className="space-y-1">
            <p className="font-heading text-lg font-bold">
              Seu treino é no estúdio 💪
            </p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Seu professor conduz tudo pessoalmente na sua aula. É só chegar no
              seu horário.
            </p>
          </div>
          <Link
            href="/aluno/horarios"
            className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Clock className="size-4" />
            Ver meus horários
          </Link>
        </div>
      </div>
    );
  }

  const [todos, execucoes]: [TreinoComTudo[], TreinoExecucao[]] =
    await Promise.all([
      getTreinosDoAluno(aluno.id),
      getExecucoesDoAluno(aluno.id),
    ]);
  const ativos = todos.filter((t) => t.ativo);
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
        <PageEmpty
          icone={Dumbbell}
          titulo="Nenhum treino ativo"
          descricao="Quando seu professor montar a ficha, ela aparece aqui com os exercícios e as demonstrações."
        />
      ) : (
        <>
          <p className="-mt-2 text-sm text-muted-foreground">{principal.nome}</p>
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
          <ExecucoesLista execucoes={execucoes} compacta />
        </section>
      ) : null}
    </div>
  );
}
