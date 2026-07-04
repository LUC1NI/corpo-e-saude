import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { AuthShell } from "../auth-shell";
import { RedefinirForm } from "./redefinir-form";

export const metadata: Metadata = { title: "Definir senha" };

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ primeiro?: string }>;
}) {
  const { primeiro } = await searchParams;

  // É necessário ter uma sessão (vinda do login provisório ou do link de
  // recuperação). Sem sessão, manda para o login.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?erro=link");

  return (
    <AuthShell>
      <RedefinirForm primeiroAcesso={primeiro === "1"} />
    </AuthShell>
  );
}
