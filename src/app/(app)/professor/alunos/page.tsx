import { Users } from "lucide-react";

import { GradeAlunos } from "@/components/acompanhamento/grade-alunos";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { requireUsuario } from "@/lib/auth";
import { getProfessorAtual } from "@/lib/professor";
import { createClient } from "@/lib/supabase/server";

export default async function ProfessorAlunosPage() {
  await requireUsuario(["professor"]);
  const professor = await getProfessorAtual();
  if (!professor) {
    return (
      <>
        <PageHeader titulo="Meus Alunos" />
        <PageEmpty
          icone={Users}
          titulo="Perfil de professor não encontrado"
          descricao="Fale com o administrador do studio."
        />
      </>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("alunos")
    .select("id, nome, tipo")
    .eq("professor_id", professor.id)
    .eq("status", "ativo")
    .order("nome");

  const alunos = (data ?? []) as { id: string; nome: string; tipo: string }[];

  return (
    <>
      <PageHeader
        titulo="Meus Alunos"
        subtitulo="Sua carteira de alunos. Abra um aluno para anamnese, avaliação e treino."
      />
      {alunos.length === 0 ? (
        <PageEmpty
          icone={Users}
          titulo="Nenhum aluno na sua carteira"
          descricao="O administrador atribui alunos a você no cadastro de alunos."
        />
      ) : (
        <GradeAlunos alunos={alunos} hrefBase="/professor/alunos" />
      )}
    </>
  );
}
