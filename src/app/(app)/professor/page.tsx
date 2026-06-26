import { PainelPlaceholder } from "@/components/painel-placeholder";
import { requireUsuario } from "@/lib/auth";

export default async function ProfessorPage() {
  const usuario = await requireUsuario(["professor"]);
  return <PainelPlaceholder papel="professor" email={usuario.email} />;
}
