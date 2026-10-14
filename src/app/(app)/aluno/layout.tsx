import { AlunoShell } from "@/components/shell/aluno-shell";
import { getAlunoAtual } from "@/lib/aluno";
import { requireUsuario } from "@/lib/auth";

export default async function AlunoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await requireUsuario(["aluno"]);
  // O tipo (presencial × online) define o menu; resolvido no servidor.
  const aluno = await getAlunoAtual();
  return (
    <AlunoShell nome={usuario.nome} tipo={aluno?.tipo ?? "presencial"}>
      {children}
    </AlunoShell>
  );
}
