/**
 * Layout neutro do grupo de auth: cada tela monta a própria casca
 * (login usa duas colunas; recuperar/redefinir usam o `AuthShell` centrado).
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
