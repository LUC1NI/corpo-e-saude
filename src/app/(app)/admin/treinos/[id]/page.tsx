import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import Link from "@/components/ui-extra/link";
import { TreinosEditor } from "@/components/treino/treinos-editor";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui-extra/page-header";
import { requireUsuario } from "@/lib/auth";
import { getExerciciosBiblioteca, getModeloTreino } from "@/lib/treino";
import { cn } from "@/lib/utils";

export default async function AdminModeloTreinoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUsuario(["admin"]);
  const { id } = await params;

  const [modelo, exercicios] = await Promise.all([
    getModeloTreino(id),
    getExerciciosBiblioteca(),
  ]);
  if (!modelo) notFound();

  return (
    <>
      <PageHeader
        titulo={modelo.nome}
        subtitulo="Para usar: abra o aluno › Treino › Usar modelo."
        acoes={
          <Link
            href="/admin/treinos"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <ArrowLeft className="size-4" />
            Treinos
          </Link>
        }
      />
      <TreinosEditor
        alunoId={null}
        treinos={[modelo]}
        exercicios={exercicios}
        redirecionarAoExcluirTreino="/admin/treinos"
      />
    </>
  );
}
