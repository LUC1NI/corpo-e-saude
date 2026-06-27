import { BibliotecaExercicios } from "@/components/treino/biblioteca-exercicios";
import { PageHeader } from "@/components/ui-extra/page-header";
import { requireUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Exercicio } from "@/lib/tipos";

export default async function ProfessorTreinosPage() {
  await requireUsuario(["professor"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("exercicios")
    .select("*")
    .order("nome");

  const exercicios = (data ?? []) as Exercicio[];

  return (
    <>
      <PageHeader
        titulo="Treinos"
        subtitulo="Biblioteca de exercícios. Monte as fichas na página de cada aluno."
      />
      <BibliotecaExercicios exercicios={exercicios} />
    </>
  );
}
