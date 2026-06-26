import { PainelPlaceholder } from "@/components/painel-placeholder";
import { requireUsuario } from "@/lib/auth";

export default async function AlunoPage() {
  const usuario = await requireUsuario(["aluno"]);
  return <PainelPlaceholder papel="aluno" email={usuario.email} />;
}
