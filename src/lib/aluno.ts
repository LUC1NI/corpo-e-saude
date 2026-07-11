import { createClient } from "@/lib/supabase/server";

/**
 * Retorna o registro de aluno do usuário logado (id + nome + tipo), ou null.
 * Usado para escopar as consultas da área do aluno aos próprios dados. O
 * `tipo` decide a experiência de treino: o online usa o modo treino (player
 * + retorno ao professor); o presencial só consulta o que foi prescrito.
 */
export async function getAlunoAtual(): Promise<{
  id: string;
  nome: string;
  tipo: "presencial" | "online";
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("alunos")
    .select("id, nome, tipo")
    .eq("usuario_id", user.id)
    .maybeSingle();

  return (
    (data as {
      id: string;
      nome: string;
      tipo: "presencial" | "online";
    } | null) ?? null
  );
}
