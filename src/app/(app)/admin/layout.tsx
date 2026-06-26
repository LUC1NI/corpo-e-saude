import { AppShell } from "@/components/shell/app-shell";
import { requireUsuario } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await requireUsuario(["admin"]);
  return (
    <AppShell papel="admin" nome={usuario.nome}>
      {children}
    </AppShell>
  );
}
