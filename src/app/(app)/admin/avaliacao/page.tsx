import { Activity } from "lucide-react";

import { GradeAlunos } from "@/components/acompanhamento/grade-alunos";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { requireUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminAvaliacaoPage() {
  await requireUsuario(["admin"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("alunos")
    .select("id, nome, tipo")
    .eq("status", "ativo")
    .order("nome");

  const alunos = (data ?? []) as { id: string; nome: string; tipo: string }[];

  return (
    <>
      <PageHeader
        titulo="Avaliação Física"
        subtitulo="Selecione um aluno para ver avaliações e evolução."
      />
      {alunos.length === 0 ? (
        <PageEmpty
          icone={Activity}
          titulo="Nenhum aluno cadastrado"
          descricao="Cadastre alunos para registrar avaliações."
        />
      ) : (
        <GradeAlunos
          alunos={alunos}
          hrefBase="/admin/alunos"
          hash="#avaliacoes"
        />
      )}
    </>
  );
}
