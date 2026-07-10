"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { homePorPapel } from "@/lib/auth";
import { getPublicEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

async function clienteIp(): Promise<string> {
  const h = await headers();
  // cf-connecting-ip é definido pela borda da Cloudflare (não-spoofável);
  // o primeiro item do x-forwarded-for pode ser forjado pelo cliente, então
  // fica só como último recurso (evita burlar o rate limit trocando de "IP").
  return (
    h.get("cf-connecting-ip")?.trim() ??
    h.get("x-real-ip")?.trim() ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local"
  );
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
const loginSchema = z.object({
  email: z.string().email("E-mail inválido."),
  senha: z.string().min(1, "Informe a senha."),
});

export type LoginState = { erro?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
  });
  if (!parsed.success) {
    return { erro: "Informe um e-mail e uma senha válidos." };
  }

  const ip = await clienteIp();
  const rl = await rateLimit(`login:${ip}:${parsed.data.email}`, 5, 60_000);
  if (!rl.ok) {
    return {
      erro: `Muitas tentativas. Tente novamente em ${rl.retornaEmSeg}s.`,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.senha,
  });

  if (error || !data.user) {
    return { erro: "E-mail ou senha incorretos." };
  }

  // Primeiro acesso: senha provisória precisa ser trocada.
  if (data.user.user_metadata?.senha_provisoria === true) {
    redirect("/redefinir-senha?primeiro=1");
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("papel, ativo")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!usuario || usuario.ativo !== true) {
    await supabase.auth.signOut();
    return { erro: "Conta inativa ou sem perfil. Fale com o studio." };
  }

  redirect(homePorPapel(usuario.papel as "admin" | "professor" | "aluno"));
}

// ---------------------------------------------------------------------------
// Esqueci minha senha — envia o e-mail de redefinição
// ---------------------------------------------------------------------------
const recuperarSchema = z.object({ email: z.string().email() });

export type RecuperarState = { ok?: boolean; erro?: string };

export async function recuperarSenhaAction(
  _prev: RecuperarState,
  formData: FormData,
): Promise<RecuperarState> {
  const parsed = recuperarSchema.safeParse({ email: formData.get("email") });
  // Não revela se o e-mail existe (evita enumeração de contas).
  if (!parsed.success) return { ok: true };

  const ip = await clienteIp();
  const rl = await rateLimit(`reset:${ip}:${parsed.data.email}`, 3, 300_000);
  if (!rl.ok) {
    return {
      erro: `Muitas solicitações. Tente novamente em ${rl.retornaEmSeg}s.`,
    };
  }

  const { NEXT_PUBLIC_SITE_URL } = getPublicEnv();
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${NEXT_PUBLIC_SITE_URL}/auth/callback?next=/redefinir-senha`,
  });

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Redefinir senha — primeiro acesso ou via link de recuperação
// (o usuário já está autenticado por sessão neste momento)
// ---------------------------------------------------------------------------

// Bloqueio das senhas/padrões mais comuns. Não substitui a checagem do
// HaveIBeenPwned (recurso Pro do Supabase), mas barra o caso mais provável
// de senha fraca sem custo. Comparado em minúsculas e sem espaços.
const SENHAS_COMUNS = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "senha123",
  "senha1234",
  "password",
  "password1",
  "password123",
  "qwerty123",
  "abc12345",
  "11111111",
  "00000000",
  "iloveyou",
  "admin123",
  "corpoesaude",
]);

const redefinirSchema = z
  .object({
    senha: z
      .string()
      .min(8, "A senha deve ter ao menos 8 caracteres.")
      .regex(/[A-Za-z]/, "A senha deve conter letras.")
      .regex(/[0-9]/, "A senha deve conter números.")
      .refine((s) => !SENHAS_COMUNS.has(s.toLowerCase().trim()), {
        message: "Essa senha é muito comum. Escolha uma mais difícil.",
      }),
    confirmar: z.string(),
  })
  .refine((d) => d.senha === d.confirmar, {
    message: "As senhas não conferem.",
    path: ["confirmar"],
  });

export type RedefinirState = { erro?: string };

export async function redefinirSenhaAction(
  _prev: RedefinirState,
  formData: FormData,
): Promise<RedefinirState> {
  const parsed = redefinirSchema.safeParse({
    senha: formData.get("senha"),
    confirmar: formData.get("confirmar"),
  });
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { erro: "Sessão expirada. Faça login novamente." };
  }

  // A senha não pode ser o próprio e-mail (nem a parte antes do @).
  const senhaLower = parsed.data.senha.toLowerCase();
  const emailLower = (user.email ?? "").toLowerCase();
  if (
    emailLower &&
    (senhaLower === emailLower || senhaLower === emailLower.split("@")[0])
  ) {
    return { erro: "Escolha uma senha diferente do seu e-mail." };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.senha,
    data: { senha_provisoria: false },
  });
  if (error) {
    return { erro: "Não foi possível atualizar a senha. Tente de novo." };
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("papel")
    .eq("id", user.id)
    .maybeSingle();

  redirect(
    usuario
      ? homePorPapel(usuario.papel as "admin" | "professor" | "aluno")
      : "/login",
  );
}

// ---------------------------------------------------------------------------
// Sair
// ---------------------------------------------------------------------------
export async function sairAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
