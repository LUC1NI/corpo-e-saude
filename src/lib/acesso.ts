import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

const ROTULO_PAPEL: Record<string, string> = {
  admin: "um administrador",
  professor: "outro professor",
  aluno: "outro aluno",
};

/**
 * Mensagem clara para quando o e-mail já existe no Auth: diz em qual papel ele
 * já está sendo usado, para o dono saber exatamente o que fazer (trocar o
 * e-mail, ou perceber que é a própria conta dele).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function mensagemEmailEmUso(
  admin: SupabaseClient<any, any, any>,
  email: string,
): Promise<string> {
  const { data } = await admin
    .from("usuarios")
    .select("papel")
    .eq("email", email)
    .maybeSingle();
  const papel = data?.papel as string | undefined;
  if (papel === "admin") {
    return "Este e-mail já é o da sua conta de administrador. Uma pessoa não pode ter dois acessos com o mesmo e-mail — use outro e-mail para este cadastro.";
  }
  if (papel && ROTULO_PAPEL[papel]) {
    return `Este e-mail já está em uso por ${ROTULO_PAPEL[papel]}. Use outro e-mail.`;
  }
  return "Já existe um usuário com este e-mail. Use outro e-mail.";
}

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
