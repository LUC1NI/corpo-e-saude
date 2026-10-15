import { FichaAluno } from "@/components/alunos/ficha-aluno";
import { requireUsuario } from "@/lib/auth";

export default async function ProfessorAlunoDetalhe({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  await requireUsuario(["professor"]);
  const [{ id }, { aba }] = await Promise.all([params, searchParams]);
  return <FichaAluno papel="professor" id={id} abaPedida={aba} />;
}
