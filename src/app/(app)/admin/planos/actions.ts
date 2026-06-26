"use server";

import { revalidatePath } from "next/cache";

import { assertPapel } from "@/lib/auth";
import { falha, sucesso, type ResultadoAcao } from "@/lib/acoes";
import { planoSchema, type PlanoInput } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

function dadosPlano(input: PlanoInput) {
  return {
    nome: input.nome,
    descricao: input.descricao ?? null,
    valor: input.valor,
    periodicidade: input.periodicidade,
    duracao_meses: input.duracao_meses ?? null,
    ativo: input.ativo,
  };
}

export async function criarPlano(input: PlanoInput): Promise<ResultadoAcao> {
  await assertPapel(["admin"]);
  const parsed = planoSchema.safeParse(input);
  if (!parsed.success) {
    return falha(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("planos").insert(dadosPlano(parsed.data));
  if (error) return falha("Não foi possível criar o plano.");

  revalidatePath("/admin/planos");
  return sucesso();
}

export async function atualizarPlano(
  id: string,
  input: PlanoInput,
): Promise<ResultadoAcao> {
  await assertPapel(["admin"]);
  const parsed = planoSchema.safeParse(input);
  if (!parsed.success) {
    return falha(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("planos")
    .update(dadosPlano(parsed.data))
    .eq("id", id);
  if (error) return falha("Não foi possível salvar o plano.");

  revalidatePath("/admin/planos");
  revalidatePath(`/admin/planos/${id}`);
  return sucesso();
}

export async function alternarAtivoPlano(
  id: string,
  ativo: boolean,
): Promise<ResultadoAcao> {
  await assertPapel(["admin"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("planos")
    .update({ ativo })
    .eq("id", id);
  if (error) return falha("Não foi possível atualizar o plano.");

  revalidatePath("/admin/planos");
  return sucesso();
}
