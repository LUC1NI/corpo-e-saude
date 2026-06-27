import { PageHeader } from "@/components/ui-extra/page-header";
import { requireUsuario } from "@/lib/auth";

import { AlunoForm } from "../../../admin/alunos/aluno-form";

export default async function NovoAlunoProfessorPage() {
  await requireUsuario(["professor"]);

  return (
    <>
      <PageHeader
        titulo="Novo aluno"
        subtitulo="O aluno entra direto na sua carteira. Depois de salvar, você já cai na anamnese."
      />
      <AlunoForm
        professores={[]}
        mostrarProfessor={false}
        destinoBase="/professor/alunos"
        hashAposCriar="#anamnese"
      />
    </>
  );
}
