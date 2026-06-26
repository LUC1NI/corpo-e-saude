import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getPublicEnv } from "@/lib/env";

/**
 * Client do Supabase para o servidor (Server Components, Server Actions
 * e Route Handlers). Lê/escreve a sessão nos cookies da requisição.
 * Usa a `anon key` — o RLS continua valendo conforme o usuário logado.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const env = getPublicEnv();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado a partir de um Server Component (cookies são
            // somente leitura ali). O refresh da sessão acontece no
            // middleware, então pode ser ignorado com segurança.
          }
        },
      },
    },
  );
}
