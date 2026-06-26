import { PainelPlaceholder } from "@/components/painel-placeholder";
import { requireUsuario } from "@/lib/auth";

export default async function AdminPage() {
  const usuario = await requireUsuario(["admin"]);
  return <PainelPlaceholder papel="admin" email={usuario.email} />;
}
