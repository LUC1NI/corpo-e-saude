import { FichaAluno } from "@/components/alunos/ficha-aluno";
import { requireUsuario } from "@/lib/auth";

export default async function AlunoDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  await requireUsuario(["admin"]);
  const [{ id }, { aba }] = await Promise.all([params, searchParams]);
  return <FichaAluno papel="admin" id={id} abaPedida={aba} />;
}
