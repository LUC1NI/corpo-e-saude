import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Atualiza/renova a sessão do Supabase em cada requisição e repassa os
 * cookies atualizados para a resposta. Chamado pelo middleware raiz.
 *
 * Enquanto as variáveis do Supabase não estiverem configuradas, apenas
 * deixa a requisição passar (para o app rodar durante o setup).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase ainda não configurado — não bloqueia o app.
  if (!url || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANTE: não rodar lógica entre criar o client e o getUser().
  // getUser() revalida o token e dispara o refresh dos cookies.
  await supabase.auth.getUser();

  return supabaseResponse;
}
