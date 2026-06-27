import { Plus, Users } from "lucide-react";
import Link from "next/link";

import { GradeAlunos } from "@/components/acompanhamento/grade-alunos";
import { buttonVariants } from "@/components/ui/button";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { requireUsuario } from "@/lib/auth";
import { getProfessorAtual } from "@/lib/professor";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

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
        acoes={
          <Link href="/professor/alunos/novo" className={cn(buttonVariants())}>
            <Plus className="size-4" />
            Novo aluno
          </Link>
        }
      />
      {alunos.length === 0 ? (
        <PageEmpty
          icone={Users}
          titulo="Nenhum aluno na sua carteira"
          descricao="Cadastre seu primeiro aluno no botão “Novo aluno”."
          acao={
            <Link href="/professor/alunos/novo" className={cn(buttonVariants())}>
              <Plus className="size-4" />
              Novo aluno
            </Link>
          }
        />
      ) : (
        <GradeAlunos alunos={alunos} hrefBase="/professor/alunos" />
      )}
    </>
  );
}
