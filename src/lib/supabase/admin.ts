import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getPublicEnv, getServerEnv } from "@/lib/env";

/**
 * Client administrativo com a `service_role key` — IGNORA o RLS.
 *
 * Use SOMENTE no servidor e SOMENTE quando estritamente necessário
 * (ex.: criar o `usuario` de um aluno com senha provisória). Toda ação
 * que use este client DEVE validar o papel do solicitante antes.
 *
 * NUNCA importe este arquivo em Client Components.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "createAdminClient não pode ser usado no client. Use apenas no servidor.",
    );
  }

  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();

  return createSupabaseClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
