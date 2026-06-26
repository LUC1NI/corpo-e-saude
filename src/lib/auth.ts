import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type Papel = "admin" | "professor" | "aluno";

export interface UsuarioAtual {
  id: string;
  email: string;
  nome: string;
  papel: Papel;
  ativo: boolean;
  /** Senha provisória ainda não trocada (primeiro acesso pendente). */
  senhaProvisoria: boolean;
}

/** Rota inicial de cada papel. */
export function homePorPapel(papel: Papel): string {
  switch (papel) {
    case "admin":
      return "/admin";
    case "professor":
      return "/professor";
    case "aluno":
      return "/aluno";
  }
}

/**
 * Retorna o usuário logado (com papel e estado), ou null se não houver
 * sessão válida. Sempre usa `getUser()` (valida o token no servidor).
 */
export async function getUsuarioAtual(): Promise<UsuarioAtual | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("usuarios")
    .select("id, email, papel, ativo")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  const email = data.email as string;
  const nomeMeta = user.user_metadata?.nome as string | undefined;

  return {
    id: data.id as string,
    email,
    nome: nomeMeta?.trim() || email.split("@")[0] || "Usuário",
    papel: data.papel as Papel,
    ativo: data.ativo as boolean,
    senhaProvisoria: user.user_metadata?.senha_provisoria === true,
  };
}

/**
 * Exige um usuário logado e válido. Redireciona quando:
 * - sem sessão  -> /login
 * - conta inativa -> /login?erro=inativo
 * - senha provisória pendente -> /redefinir-senha?primeiro=1
 * - papel não permitido -> home do próprio papel
 *
 * Use no topo de cada página/área protegida (validação no servidor).
 */
export async function requireUsuario(papeis?: Papel[]): Promise<UsuarioAtual> {
  const usuario = await getUsuarioAtual();

  if (!usuario) redirect("/login");
  if (!usuario.ativo) redirect("/login?erro=inativo");
  if (usuario.senhaProvisoria) redirect("/redefinir-senha?primeiro=1");
  if (papeis && !papeis.includes(usuario.papel)) {
    redirect(homePorPapel(usuario.papel));
  }

  return usuario;
}
