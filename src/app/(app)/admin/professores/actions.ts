"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mensagemEmailEmUso } from "@/lib/acesso";
import { assertPapel } from "@/lib/auth";
import { falha, sucesso, type ResultadoAcao } from "@/lib/acoes";
import { gerarSenhaProvisoria } from "@/lib/senha";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const professorSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do professor."),
  email: z.string().trim().email("E-mail inválido."),
  telefone: z.string().trim().optional(),
  especialidade: z.string().trim().optional(),
});

export type ProfessorInput = z.input<typeof professorSchema>;

/**
 * Cria um professor: usuário no Auth com senha provisória (troca no 1º acesso),
 * registro em `usuarios` (papel professor) e em `professores`. Retorna a senha
 * provisória para o dono repassar. Admin apenas.
 */
export async function criarProfessor(
  input: ProfessorInput,
): Promise<ResultadoAcao<{ senha: string; email: string }>> {
  await assertPapel(["admin"]);
  const parsed = professorSchema.safeParse(input);
  if (!parsed.success) {
    return falha(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { nome, email, telefone, especialidade } = parsed.data;

  const senha = gerarSenhaProvisoria();
  const admin = createAdminClient();

  const { data: criado, error: errAuth } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { senha_provisoria: true, nome },
  });
  if (errAuth || !criado.user) {
    if (errAuth?.message?.includes("already")) {
      return falha(await mensagemEmailEmUso(admin, email));
    }
    return falha("Não foi possível criar o acesso.");
  }
  const userId = criado.user.id;

  const { error: errUsuario } = await admin
    .from("usuarios")
    .insert({ id: userId, email, papel: "professor", ativo: true });
  if (errUsuario) {
    await admin.auth.admin.deleteUser(userId);
    return falha("Não foi possível criar o perfil de acesso.");
  }

  const { error: errProf } = await admin.from("professores").insert({
    usuario_id: userId,
    nome,
    telefone: telefone || null,
    especialidade: especialidade || null,
    ativo: true,
  });
  if (errProf) {
    await admin.from("usuarios").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
    return falha("Não foi possível criar o professor.");
  }

  revalidatePath("/admin/professores");
  return sucesso({ senha, email });
}

export async function alternarAtivoProfessor(
  id: string,
  ativo: boolean,
): Promise<ResultadoAcao> {
  await assertPapel(["admin"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("professores")
    .update({ ativo })
    .eq("id", id);
  if (error) return falha("Não foi possível atualizar o professor.");

  revalidatePath("/admin/professores");
  revalidatePath("/admin/horarios");
  return sucesso();
}
