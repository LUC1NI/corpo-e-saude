import { AlunoShell } from "@/components/shell/aluno-shell";
import { requireUsuario } from "@/lib/auth";

export default async function AlunoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await requireUsuario(["aluno"]);
  return <AlunoShell nome={usuario.nome}>{children}</AlunoShell>;
}
