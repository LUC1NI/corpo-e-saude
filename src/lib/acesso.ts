import { createAdminClient } from "@/lib/supabase/admin";

/**
 * True se o aluno tem acesso criado mas ainda não definiu a própria senha
 * (ou seja, segue com a senha provisória). Server-only — usa a service_role.
 */
export async function aguardandoPrimeiroAcesso(
  usuarioId: string | null,
): Promise<boolean> {
  if (!usuarioId) return false;
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(usuarioId);
  return data.user?.user_metadata?.senha_provisoria === true;
}
