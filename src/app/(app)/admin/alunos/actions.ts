"use server";

import { revalidatePath } from "next/cache";

import { mensagemEmailEmUso } from "@/lib/acesso";
import { assertPapel } from "@/lib/auth";
import { falha, sucesso, type ResultadoAcao } from "@/lib/acoes";
import { getProfessorAtual } from "@/lib/professor";
import {
  alunoSchema,
  dadosFiscaisSchema,
  type AlunoInput,
  type DadosFiscaisInput,
} from "@/lib/schemas";
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

/**
 * Grava CPF/endereço (tomador da nota fiscal). Só o ADMIN: o professor não
 * vê nem edita dado fiscal (LGPD). Tabela separada com RLS só admin + aluno.
 */
async function salvarDadosFiscais(
  supabase: Awaited<ReturnType<typeof createClient>>,
  alunoId: string,
  fiscal: DadosFiscaisInput,
): Promise<string | null> {
  const { error } = await supabase.from("alunos_dados_fiscais").upsert({
    aluno_id: alunoId,
    cpf: fiscal.cpf ?? null,
    cep: fiscal.cep ?? null,
    logradouro: fiscal.logradouro ?? null,
    numero: fiscal.numero ?? null,
    complemento: fiscal.complemento ?? null,
    bairro: fiscal.bairro ?? null,
    cidade: fiscal.cidade ?? null,
    uf: fiscal.uf ?? null,
    codigo_municipio: fiscal.codigo_municipio ?? null,
    atualizado_em: new Date().toISOString(),
  });
  return error ? "Aluno salvo, mas os dados fiscais (CPF/endereço) não foram gravados." : null;
}

export async function criarAluno(
  input: AlunoInput,
  fiscalInput?: DadosFiscaisInput,
): Promise<ResultadoAcao<{ id: string }>> {
  const usuario = await assertPapel(["admin", "professor"]);
  const parsed = alunoSchema.safeParse(input);
  if (!parsed.success) {
    return falha(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const fiscal =
    usuario.papel === "admin" && fiscalInput
      ? dadosFiscaisSchema.safeParse(fiscalInput)
      : null;
  if (fiscal && !fiscal.success) {
    return falha(fiscal.error.issues[0]?.message ?? "Dados fiscais inválidos.");
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

  if (fiscal?.success) {
    const erro = await salvarDadosFiscais(supabase, data.id as string, fiscal.data);
    if (erro) return falha(erro);
  }

  revalidarListas();
  return sucesso({ id: data.id as string });
}

export async function atualizarAluno(
  id: string,
  input: AlunoInput,
  fiscalInput?: DadosFiscaisInput,
): Promise<ResultadoAcao> {
  const usuario = await assertPapel(["admin", "professor"]);
  const parsed = alunoSchema.safeParse(input);
  if (!parsed.success) {
    return falha(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const fiscal =
    usuario.papel === "admin" && fiscalInput
      ? dadosFiscaisSchema.safeParse(fiscalInput)
      : null;
  if (fiscal && !fiscal.success) {
    return falha(fiscal.error.issues[0]?.message ?? "Dados fiscais inválidos.");
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

  if (fiscal?.success) {
    const erro = await salvarDadosFiscais(supabase, id, fiscal.data);
    if (erro) return falha(erro);
  }

  revalidarListas(id);
  return sucesso();
}

/**
 * Exclui o aluno e tudo que depende dele (matrículas, pagamentos, presenças,
 * anamnese, avaliações e treinos caem por cascade). Se houver acesso criado,
 * remove também o usuário do Auth para não deixar conta órfã. Admin apenas.
 */
export async function excluirAluno(id: string): Promise<ResultadoAcao> {
  await assertPapel(["admin"]);

  const supabase = await createClient();
  const { data: aluno } = await supabase
    .from("alunos")
    .select("id, usuario_id")
    .eq("id", id)
    .maybeSingle();
  if (!aluno) return falha("Aluno não encontrado.");

  // Nota fiscal é registro fiscal: aluno com nota não é apagado (o banco
  // também impede). Inativar mantém o histórico.
  const { count: notas } = await supabase
    .from("notas_fiscais")
    .select("id", { count: "exact", head: true })
    .eq("aluno_id", id);
  if ((notas ?? 0) > 0) {
    return falha(
      "Este aluno tem nota fiscal registrada e não pode ser excluído. Inative o aluno em vez de excluir.",
    );
  }

  const { error } = await supabase.from("alunos").delete().eq("id", id);
  if (error) return falha("Não foi possível excluir o aluno.");

  // Remove o acesso (auth.users → usuarios cai por cascade) se existir.
  if (aluno.usuario_id) {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(aluno.usuario_id as string);
  }

  revalidarListas();
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
    if (errAuth?.message?.includes("already")) {
      return falha(await mensagemEmailEmUso(admin, aluno.email));
    }
    return falha("Não foi possível criar o acesso.");
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

/**
 * Gera uma NOVA senha provisória para um aluno que já tem acesso mas ainda
 * não fez o primeiro login. Permite ao dono reobter a credencial para
 * repassar (a anterior é invalidada). Não funciona depois que o aluno já
 * definiu a própria senha — aí ele usa "esqueci minha senha".
 *
 * Não guardamos a senha em lugar nenhum: ela só existe no retorno desta
 * chamada, respeitando "o dono nunca guarda a senha do aluno".
 */
export async function redefinirSenhaProvisoria(
  alunoId: string,
): Promise<ResultadoAcao<{ senha: string; email: string }>> {
  await assertPapel(["admin", "professor"]);

  const supabase = await createClient();
  const { data: aluno } = await supabase
    .from("alunos")
    .select("id, nome, email, usuario_id")
    .eq("id", alunoId)
    .maybeSingle();

  if (!aluno) return falha("Aluno não encontrado.");
  if (!aluno.usuario_id) {
    return falha("Este aluno ainda não tem acesso. Gere o acesso primeiro.");
  }
  if (!aluno.email) {
    return falha("Cadastre o e-mail do aluno antes de redefinir o acesso.");
  }

  const admin = createAdminClient();

  // Só permite enquanto o acesso ainda é provisório (aluno não trocou a senha).
  const { data: atual } = await admin.auth.admin.getUserById(aluno.usuario_id);
  if (atual.user?.user_metadata?.senha_provisoria !== true) {
    return falha(
      "O aluno já definiu a própria senha. Se ele esqueceu, use “esqueci minha senha” na tela de login.",
    );
  }

  const senha = gerarSenhaProvisoria();
  const { error } = await admin.auth.admin.updateUserById(aluno.usuario_id, {
    password: senha,
    user_metadata: { senha_provisoria: true, nome: aluno.nome },
  });
  if (error) return falha("Não foi possível redefinir a senha provisória.");

  revalidarListas(alunoId);
  return sucesso({ senha, email: aluno.email });
}
