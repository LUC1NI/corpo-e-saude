import { createClient } from "@/lib/supabase/server";

/**
 * Retorna o registro de aluno do usuário logado (id + nome), ou null.
 * Usado para escopar as consultas da área do aluno aos próprios dados.
 */
export async function getAlunoAtual(): Promise<{
  id: string;
  nome: string;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("alunos")
    .select("id, nome")
    .eq("usuario_id", user.id)
    .maybeSingle();

  return (data as { id: string; nome: string } | null) ?? null;
}
