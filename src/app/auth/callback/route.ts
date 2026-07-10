import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Recebe o redirecionamento dos links de e-mail do Supabase (recuperação
 * de senha, confirmação) e troca o `code` por uma sessão (cookies).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Só aceita caminho interno: barra open redirect via `next` manipulado
  // ("//evil.com", "https://evil.com", "/\evil.com" viram "/").
  const bruto = searchParams.get("next") ?? "/";
  const next =
    bruto.startsWith("/") && !bruto.startsWith("//") && !bruto.startsWith("/\\")
      ? bruto
      : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?erro=link`);
}
