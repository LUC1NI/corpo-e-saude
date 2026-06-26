import { Activity } from "lucide-react";

import { GradeAlunos } from "@/components/acompanhamento/grade-alunos";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { requireUsuario } from "@/lib/auth";
import { getProfessorAtual } from "@/lib/professor";
import { createClient } from "@/lib/supabase/server";

export default async function ProfessorAvaliacaoPage() {
  await requireUsuario(["professor"]);
  const professor = await getProfessorAtual();
  if (!professor) return null;

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
        titulo="Avaliação Física"
        subtitulo="Selecione um aluno para registrar avaliações e ver a evolução."
      />
      {alunos.length === 0 ? (
        <PageEmpty
          icone={Activity}
          titulo="Nenhum aluno na sua carteira"
          descricao="Os alunos atribuídos a você aparecerão aqui."
        />
      ) : (
        <GradeAlunos
          alunos={alunos}
          hrefBase="/professor/alunos"
          hash="#avaliacoes"
        />
      )}
    </>
  );
}
