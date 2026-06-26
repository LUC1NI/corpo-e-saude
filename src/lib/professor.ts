import { createClient } from "@/lib/supabase/server";

/**
 * Retorna o registro de professor do usuário logado (id + nome), ou null.
 * Usado para escopar consultas/ações à carteira do próprio professor.
 */
export async function getProfessorAtual(): Promise<{
  id: string;
  nome: string;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("professores")
    .select("id, nome")
    .eq("usuario_id", user.id)
    .maybeSingle();

  return (data as { id: string; nome: string } | null) ?? null;
}
