import { Dumbbell } from "lucide-react";

import { TreinoDoAluno } from "@/components/treino/treino-do-aluno";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { requireUsuario } from "@/lib/auth";
import { getAlunoAtual } from "@/lib/aluno";
import { getTreinosDoAluno } from "@/lib/treino";
import { diaDaSemanaHoje } from "@/lib/treino-utils";
import type { TreinoComTudo } from "@/lib/tipos";

export default async function AlunoTreinoPage() {
  await requireUsuario(["aluno"]);

  const aluno = await getAlunoAtual();
  let ativos: TreinoComTudo[] = [];
  if (aluno) {
    const todos = await getTreinosDoAluno(aluno.id);
    ativos = todos.filter((t) => t.ativo);
  }
  const principal = ativos[0] ?? null;
  const diaHoje = diaDaSemanaHoje();

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-xl font-bold">Seu treino</h1>

      {!principal ? (
        <PageEmpty
          icone={Dumbbell}
          titulo="Nenhum treino ativo"
          descricao="Quando seu professor montar a ficha, ela aparece aqui com os exercícios e as demonstrações."
        />
      ) : (
        <>
          <p className="-mt-2 text-sm text-muted-foreground">{principal.nome}</p>
          <TreinoDoAluno treino={principal} diaHoje={diaHoje} />
        </>
      )}
    </div>
  );
}
