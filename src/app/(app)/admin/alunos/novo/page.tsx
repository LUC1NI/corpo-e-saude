import { PageHeader } from "@/components/ui-extra/page-header";
import { requireUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { AlunoForm } from "../aluno-form";

export default async function NovoAlunoPage() {
  await requireUsuario(["admin"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("professores")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome");

  return (
    <>
      <PageHeader titulo="Novo aluno" subtitulo="Cadastre um aluno do studio." />
      <AlunoForm professores={(data ?? []) as { id: string; nome: string }[]} />
    </>
  );
}
