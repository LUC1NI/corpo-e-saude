"use server";

import { revalidatePath } from "next/cache";

import { assertPapel } from "@/lib/auth";
import { falha, sucesso, type ResultadoAcao } from "@/lib/acoes";
import { getProfessorAtual } from "@/lib/professor";
import { alunoSchema, type AlunoInput } from "@/lib/schemas";
import { gerarSenhaProvisoria } from "@/lib/senha";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function revalidarListas(id?: string) {
  revalidatePath("/admin/alunos");
  revalidatePath("/professor/alunos");
  if (id) {
    revalidatePath(`/admin/alunos/${id}`);
    revalidatePath(`/professor/alunos/${id}`);
  }
}

function dadosAluno(input: AlunoInput) {
  return {
    nome: input.nome,
    data_nascimento: input.data_nascimento ?? null,
    telefone: input.telefone ?? null,
    email: input.email ?? null,
    tipo: input.tipo,
    professor_id: input.professor_id ?? null,
    status: input.status,
  };
}

export async function criarAluno(
  input: AlunoInput,
): Promise<ResultadoAcao<{ id: string }>> {
  const usuario = await assertPapel(["admin", "professor"]);
  const parsed = alunoSchema.safeParse(input);
  if (!parsed.success) {
    return falha(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const dados = dadosAluno(parsed.data);
  // Professor só cadastra na própria carteira (ignora o que vier do client).
  if (usuario.papel === "professor") {
    const professor = await getProfessorAtual();
    if (!professor) return falha("Perfil de professor não encontrado.");
    dados.professor_id = professor.id;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("alunos")
    .insert(dados)
    .select("id")
    .single();
  if (error || !data) return falha("Não foi possível cadastrar o aluno.");

  revalidarListas();
  return sucesso({ id: data.id as string });
}

export async function atualizarAluno(
  id: string,
  input: AlunoInput,
): Promise<ResultadoAcao> {
  const usuario = await assertPapel(["admin", "professor"]);
  const parsed = alunoSchema.safeParse(input);
  if (!parsed.success) {
    return falha(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const dados = dadosAluno(parsed.data);
  // Professor não reatribui o aluno para outra carteira (e mantém o RLS ok).
  if (usuario.papel === "professor") {
    const professor = await getProfessorAtual();
    if (!professor) return falha("Perfil de professor não encontrado.");
    dados.professor_id = professor.id;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("alunos").update(dados).eq("id", id);
  if (error) return falha("Não foi possível salvar o aluno.");

  revalidarListas(id);
  return sucesso();
}

export async function alternarStatusAluno(
  id: string,
  status: "ativo" | "inativo",
): Promise<ResultadoAcao> {
  await assertPapel(["admin"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("alunos")
    .update({ status })
    .eq("id", id);
  if (error) return falha("Não foi possível atualizar o status.");

  revalidatePath("/admin/alunos");
  revalidatePath(`/admin/alunos/${id}`);
  return sucesso();
}

/**
 * Gera o acesso do aluno: cria o usuário no Auth com senha provisória
 * (troca obrigatória no 1º login), o registro em `usuarios` e vincula em
 * `alunos.usuario_id`. Retorna a senha provisória para o dono repassar.
 *
 * Usa a service_role (createAdminClient) — só roda no servidor e exige
 * que o solicitante seja admin.
 */
export async function gerarAcessoAluno(
  alunoId: string,
): Promise<ResultadoAcao<{ senha: string; email: string }>> {
  await assertPapel(["admin", "professor"]);

  // SELECT com o client do usuário: o RLS já escopa o professor à própria
  // carteira (aluno de outro professor retorna vazio → "não encontrado").
  const supabase = await createClient();
  const { data: aluno } = await supabase
    .from("alunos")
    .select("id, nome, email, usuario_id")
    .eq("id", alunoId)
    .maybeSingle();

  if (!aluno) return falha("Aluno não encontrado.");
  if (aluno.usuario_id) return falha("Este aluno já tem acesso criado.");
  if (!aluno.email) {
    return falha("Cadastre o e-mail do aluno antes de gerar o acesso.");
  }

  const senha = gerarSenhaProvisoria();
  const admin = createAdminClient();

  const { data: criado, error: errAuth } = await admin.auth.admin.createUser({
    email: aluno.email,
    password: senha,
    email_confirm: true,
    user_metadata: { senha_provisoria: true, nome: aluno.nome },
  });
  if (errAuth || !criado.user) {
    return falha(
      errAuth?.message?.includes("already")
        ? "Já existe um usuário com este e-mail."
        : "Não foi possível criar o acesso.",
    );
  }

  const userId = criado.user.id;

  const { error: errUsuario } = await admin
    .from("usuarios")
    .insert({ id: userId, email: aluno.email, papel: "aluno", ativo: true });
  if (errUsuario) {
    await admin.auth.admin.deleteUser(userId); // rollback do Auth
    return falha("Não foi possível criar o perfil de acesso.");
  }

  const { error: errVinculo } = await admin
    .from("alunos")
    .update({ usuario_id: userId })
    .eq("id", alunoId);
  if (errVinculo) {
    await admin.from("usuarios").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
    return falha("Não foi possível vincular o acesso ao aluno.");
  }

  revalidarListas(alunoId);
  return sucesso({ senha, email: aluno.email });
}
