import { notFound } from "next/navigation";

import { AcompanhamentoCards } from "@/components/acompanhamento/acompanhamento-cards";
import { TreinosEditor } from "@/components/treino/treinos-editor";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui-extra/page-header";
import { aguardandoPrimeiroAcesso } from "@/lib/acesso";
import { requireUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getExerciciosBiblioteca,
  getModelosTreino,
  getTreinosDoAluno,
} from "@/lib/treino";
import type { Anamnese, Aluno, AvaliacaoFisica } from "@/lib/tipos";

import { AlunoForm } from "../../../admin/alunos/aluno-form";
import { GerarAcesso } from "../../../admin/alunos/gerar-acesso";

export default async function ProfessorAlunoDetalhe({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUsuario(["professor"]);
  const { id } = await params;

  const supabase = await createClient();
  const [
    { data: alunoData },
    { data: anamneseData },
    { data: avaliacoesData },
    treinos,
    exercicios,
    modelos,
  ] = await Promise.all([
    supabase.from("alunos").select("*").eq("id", id).maybeSingle(),
    supabase.from("anamneses").select("*").eq("aluno_id", id).maybeSingle(),
    supabase
      .from("avaliacoes_fisicas")
      .select("*")
      .eq("aluno_id", id)
      .order("data", { ascending: false }),
    getTreinosDoAluno(id),
    getExerciciosBiblioteca(),
    getModelosTreino(),
  ]);

  if (!alunoData) notFound();
  const aluno = alunoData as Aluno;
  const anamnese = (anamneseData as Anamnese | null) ?? null;
  const avaliacoes = (avaliacoesData ?? []) as AvaliacaoFisica[];
  const aguardandoAcesso = await aguardandoPrimeiroAcesso(aluno.usuario_id);

  return (
    <>
      <PageHeader
        titulo={aluno.nome}
        subtitulo="Acompanhamento do aluno: anamnese e avaliação física."
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Acesso do aluno</CardTitle>
            <CardDescription>
              Gere o login do aluno (senha provisória trocada no 1º acesso).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GerarAcesso
              alunoId={aluno.id}
              temAcesso={Boolean(aluno.usuario_id)}
              aguardandoPrimeiroAcesso={aguardandoAcesso}
              email={aluno.email}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados do aluno</CardTitle>
          </CardHeader>
          <CardContent>
            <AlunoForm
              alunoId={aluno.id}
              professores={[]}
              mostrarProfessor={false}
              destinoBase="/professor/alunos"
              valoresIniciais={{
                nome: aluno.nome,
                email: aluno.email ?? "",
                telefone: aluno.telefone ?? "",
                data_nascimento: aluno.data_nascimento ?? "",
                tipo: aluno.tipo,
                status: aluno.status,
              }}
            />
          </CardContent>
        </Card>

        <AcompanhamentoCards
          alunoId={aluno.id}
          anamnese={anamnese}
          avaliacoes={avaliacoes}
        />

        <Card id="treino">
          <CardHeader>
            <CardTitle>Ficha de treino</CardTitle>
            <CardDescription>
              Aplique um treino pronto e ajuste, ou monte do zero — dias de
              treino (A/B/C) e exercícios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TreinosEditor
              alunoId={aluno.id}
              treinos={treinos}
              exercicios={exercicios}
              modelos={modelos}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
