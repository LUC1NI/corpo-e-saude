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
import type { Aluno } from "@/lib/tipos";

import { AlunoForm } from "../aluno-form";
import { GerarAcesso } from "../gerar-acesso";

export default async function AlunoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUsuario(["admin"]);
  const { id } = await params;

  const supabase = await createClient();
  const [{ data: alunoData }, { data: professoresData }] = await Promise.all([
    supabase.from("alunos").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("professores")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome"),
  ]);

  if (!alunoData) notFound();
  const aluno = alunoData as Aluno;
  const professores = (professoresData ?? []) as { id: string; nome: string }[];

  return (
    <>
      <PageHeader titulo={aluno.nome} subtitulo="Cadastro e acesso do aluno." />

      <div className="space-y-6">
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
