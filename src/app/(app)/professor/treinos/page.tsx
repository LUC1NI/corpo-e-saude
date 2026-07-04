import { BibliotecaExercicios } from "@/components/treino/biblioteca-exercicios";
import { ListaModelos } from "@/components/treino/lista-modelos";
import { NovoModeloButton } from "@/components/treino/novo-modelo-button";
import { PageHeader } from "@/components/ui-extra/page-header";
import { requireUsuario } from "@/lib/auth";
import { getExerciciosBiblioteca, getModelosTreino } from "@/lib/treino";

export default async function ProfessorTreinosPage() {
  await requireUsuario(["professor"]);
  const [modelos, exercicios] = await Promise.all([
    getModelosTreino(),
    getExerciciosBiblioteca(),
  ]);

  return (
    <>
      <PageHeader
        titulo="Treinos"
        subtitulo="Monte treinos reutilizáveis e aplique a qualquer aluno; abaixo, a biblioteca de exercícios."
        acoes={<NovoModeloButton basePath="/professor/treinos" />}
      />

      <section className="mb-8">
        <h2 className="mb-3 font-heading text-lg font-bold">
          Treinos montados
        </h2>
        <ListaModelos modelos={modelos} basePath="/professor/treinos" />
      </section>

      <section>
        <h2 className="mb-3 font-heading text-lg font-bold">
          Biblioteca de exercícios
        </h2>
        <BibliotecaExercicios exercicios={exercicios} />
      </section>
    </>
  );
}
