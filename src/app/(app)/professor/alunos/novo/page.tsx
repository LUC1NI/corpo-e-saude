import { CadastroRapido } from "@/components/alunos/cadastro-rapido";
import { PageHeader } from "@/components/ui-extra/page-header";
import { requireUsuario } from "@/lib/auth";
import { horariosComOcupacao } from "@/lib/horarios";
import { getProfessorAtual } from "@/lib/professor";
import { createClient } from "@/lib/supabase/server";

export default async function NovoAlunoProfessorPage() {
  await requireUsuario(["professor"]);
  const professor = await getProfessorAtual();
  const supabase = await createClient();
  const horarios = professor ? await horariosComOcupacao(supabase, professor.id) : [];

  return (
    <>
      <PageHeader titulo="Novo aluno" subtitulo="Entra direto na sua carteira." />
      <CadastroRapido
        modo="professor"
        professores={[]}
        planos={[]}
        horarios={horarios}
        professorFixoId={professor?.id}
        destinoBase="/professor/alunos"
      />
    </>
  );
}
