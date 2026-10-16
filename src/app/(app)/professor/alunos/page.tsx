import { Plus, Users } from "lucide-react";
import Link from "@/components/ui-extra/link";

import { GradeAlunos } from "@/components/acompanhamento/grade-alunos";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { requireUsuario } from "@/lib/auth";
import { getProfessorAtual } from "@/lib/professor";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function ProfessorAlunosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireUsuario(["professor"]);
  const { q } = await searchParams;
  const busca = q?.trim() ?? "";
  const professor = await getProfessorAtual();
  if (!professor) {
    return (
      <>
        <PageHeader titulo="Meus Alunos" />
        <PageEmpty
          icone={Users}
          titulo="Perfil de professor não encontrado"
          descricao="Fale com o administrador do estúdio."
        />
      </>
    );
  }

  const supabase = await createClient();
  let query = supabase
    .from("alunos")
    .select("id, nome, tipo")
    .eq("professor_id", professor.id)
    .eq("status", "ativo")
    .order("nome");
  if (busca) query = query.ilike("nome", `%${busca}%`);
  const { data } = await query;

  const alunos = (data ?? []) as { id: string; nome: string; tipo: string }[];

  return (
    <>
      <PageHeader
        titulo="Meus Alunos"
        acoes={
          <Link href="/professor/alunos/novo" className={cn(buttonVariants())}>
            <Plus className="size-4" />
            Novo aluno
          </Link>
        }
      />
      <form className="mb-4 max-w-sm">
        <Input
          name="q"
          defaultValue={busca}
          placeholder="Buscar por nome…"
          aria-label="Buscar aluno"
        />
      </form>

      {alunos.length === 0 ? (
        <PageEmpty
          icone={Users}
          titulo={
            busca ? "Nenhum aluno encontrado" : "Nenhum aluno na sua carteira"
          }
          descricao={
            busca
              ? "Tente outro termo de busca."
              : "Cadastre seu primeiro aluno no botão “Novo aluno”."
          }
          acao={
            !busca ? (
              <Link
                href="/professor/alunos/novo"
                className={cn(buttonVariants())}
              >
                <Plus className="size-4" />
                Novo aluno
              </Link>
            ) : undefined
          }
        />
      ) : (
        <GradeAlunos alunos={alunos} hrefBase="/professor/alunos" />
      )}
    </>
  );
}
