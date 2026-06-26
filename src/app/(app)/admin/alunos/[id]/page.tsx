import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui-extra/page-header";
import { requireUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Aluno, Periodicidade } from "@/lib/tipos";

import { AlunoForm } from "../aluno-form";
import { GerarAcesso } from "../gerar-acesso";
import { MatriculaCard, type MatriculaAtiva } from "../matricula-card";

export default async function AlunoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUsuario(["admin"]);
  const { id } = await params;

  const supabase = await createClient();
  const [{ data: alunoData }, { data: professoresData }, { data: planosData }, { data: matriculaData }] =
    await Promise.all([
      supabase.from("alunos").select("*").eq("id", id).maybeSingle(),
      supabase.from("professores").select("id, nome").eq("ativo", true).order("nome"),
      supabase
        .from("planos")
        .select("id, nome, valor, periodicidade")
        .eq("ativo", true)
        .order("nome"),
      supabase
        .from("matriculas")
        .select(
          "id, data_proxima_cobranca, renovacao_automatica, planos(nome, valor, periodicidade)",
        )
        .eq("aluno_id", id)
        .eq("status", "ativa")
        .maybeSingle(),
    ]);

  if (!alunoData) notFound();
  const aluno = alunoData as Aluno;
  const professores = (professoresData ?? []) as { id: string; nome: string }[];
  const planos = (planosData ?? []) as {
    id: string;
    nome: string;
    valor: number;
    periodicidade: Periodicidade;
  }[];

  let matricula: MatriculaAtiva | null = null;
  if (matriculaData) {
    const plano = (
      matriculaData as unknown as {
        planos: { nome: string; valor: number; periodicidade: Periodicidade };
      }
    ).planos;
    matricula = {
      id: matriculaData.id as string,
      plano_nome: plano.nome,
      valor: plano.valor,
      periodicidade: plano.periodicidade,
      data_proxima_cobranca: matriculaData.data_proxima_cobranca as string,
      renovacao_automatica: matriculaData.renovacao_automatica as boolean,
    };
  }

  return (
    <>
      <PageHeader titulo={aluno.nome} subtitulo="Cadastro, matrícula e acesso." />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Plano e matrícula</CardTitle>
          </CardHeader>
          <CardContent>
            <MatriculaCard alunoId={aluno.id} planos={planos} matricula={matricula} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acesso do aluno</CardTitle>
          </CardHeader>
          <CardContent>
            <GerarAcesso
              alunoId={aluno.id}
              temAcesso={Boolean(aluno.usuario_id)}
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
              professores={professores}
              valoresIniciais={{
                nome: aluno.nome,
                email: aluno.email ?? "",
                telefone: aluno.telefone ?? "",
                data_nascimento: aluno.data_nascimento ?? "",
                tipo: aluno.tipo,
                professor_id: aluno.professor_id ?? undefined,
                status: aluno.status,
              }}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
