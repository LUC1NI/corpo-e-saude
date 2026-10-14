"use server";

import { z } from "zod";

import { falha, sucesso, type ResultadoAcao } from "@/lib/acoes";
import { assertPapel } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const base64url = z.string().min(16).max(200).regex(/^[A-Za-z0-9_-]+=*$/);

const inscricaoSchema = z.object({
  endpoint: z.string().url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: base64url, auth: base64url }),
  userAgent: z.string().max(300).optional(),
});

export type InscricaoPushInput = z.infer<typeof inscricaoSchema>;

/**
 * Salva a inscrição de push deste navegador para o usuário logado. Usa o
 * service_role só para o upsert por `endpoint`: se o aparelho estava inscrito
 * para outra pessoa (celular compartilhado), passa a ser deste usuário. O
 * `usuario_id` vem SEMPRE da sessão, nunca do client.
 */
export async function salvarInscricaoPush(
  input: InscricaoPushInput,
): Promise<ResultadoAcao> {
  const usuario = await assertPapel(["aluno"]);
  const parsed = inscricaoSchema.safeParse(input);
  if (!parsed.success) return falha("Inscrição inválida.");

  const admin = createAdminClient();
  const { error } = await admin.from("push_inscricoes").upsert(
    {
      usuario_id: usuario.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      user_agent: parsed.data.userAgent ?? null,
    },
    { onConflict: "endpoint" },
  );
  if (error) return falha("Não foi possível ativar as notificações.");
  return sucesso();
}

/** Remove a inscrição deste navegador (RLS: só a própria). */
export async function removerInscricaoPush(
  endpoint: string,
): Promise<ResultadoAcao> {
  await assertPapel(["aluno"]);
  const parsed = z.string().url().max(1000).safeParse(endpoint);
  if (!parsed.success) return falha("Inscrição inválida.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("push_inscricoes")
    .delete()
    .eq("endpoint", parsed.data);
  if (error) return falha("Não foi possível desativar as notificações.");
  return sucesso();
}
