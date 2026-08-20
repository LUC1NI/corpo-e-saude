import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Registra um erro em `logs_erro` (monitoramento sem custo — sem Sentry).
 * Nunca lança: se o próprio log falhar, só vai pro console (não pode derrubar
 * o fluxo que estava sendo logado).
 */
export async function registrarErro(
  origem: string,
  erro: unknown,
  detalhes?: Record<string, unknown>,
): Promise<void> {
  const mensagem = erro instanceof Error ? erro.message : String(erro);
  try {
    const supabase = createAdminClient();
    await supabase.from("logs_erro").insert({ origem, mensagem, detalhes: detalhes ?? null });
  } catch (e) {
    console.error("registrarErro: falha ao gravar log —", e);
  }
}
