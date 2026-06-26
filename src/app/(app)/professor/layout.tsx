import { AppShell } from "@/components/shell/app-shell";
import { requireUsuario } from "@/lib/auth";

export default async function ProfessorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await requireUsuario(["professor"]);
  return (
    <AppShell papel="professor" nome={usuario.nome}>
      {children}
    </AppShell>
  );
}
