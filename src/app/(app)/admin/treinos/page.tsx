import { BibliotecaExercicios } from "@/components/treino/biblioteca-exercicios";
import { ListaModelos } from "@/components/treino/lista-modelos";
import { NovoModeloButton } from "@/components/treino/novo-modelo-button";
import { PageHeader } from "@/components/ui-extra/page-header";
import { requireUsuario } from "@/lib/auth";
import { getExerciciosBiblioteca, getModelosTreino } from "@/lib/treino";

export default async function AdminTreinosPage() {
  await requireUsuario(["admin"]);
  const [modelos, exercicios] = await Promise.all([
    getModelosTreino(),
    getExerciciosBiblioteca(),
  ]);

  return (
    <>
      <PageHeader
        titulo="Modelos de treino"
        subtitulo="Monte uma vez e aplique a vários alunos."
        acoes={<NovoModeloButton basePath="/admin/treinos" />}
      />

      <section className="mb-8">
        <h2 className="mb-3 font-heading text-lg font-bold">
          Modelos de treino
        </h2>
        <ListaModelos modelos={modelos} basePath="/admin/treinos" />
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
