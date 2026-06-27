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
import { requireUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getExerciciosBiblioteca, getTreinosDoAluno } from "@/lib/treino";
import type { Anamnese, Aluno, AvaliacaoFisica } from "@/lib/tipos";

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
  ]);

  if (!alunoData) notFound();
  const aluno = alunoData as Aluno;
  const anamnese = (anamneseData as Anamnese | null) ?? null;
  const avaliacoes = (avaliacoesData ?? []) as AvaliacaoFisica[];

  return (
    <>
      <PageHeader
        titulo={aluno.nome}
        subtitulo="Acompanhamento do aluno: anamnese e avaliação física."
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Tipo</dt>
                <dd className="font-medium capitalize">{aluno.tipo}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Telefone</dt>
                <dd className="font-medium">{aluno.telefone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">E-mail</dt>
                <dd className="font-medium">{aluno.email ?? "—"}</dd>
              </div>
            </dl>
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
              Fichas, divisões (A/B/C) e prescrição de exercícios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TreinosEditor
              alunoId={aluno.id}
              treinos={treinos}
              exercicios={exercicios}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
