import { notFound } from "next/navigation";

import { AcompanhamentoCards } from "@/components/acompanhamento/acompanhamento-cards";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/ui-extra/page-header";
import { StatusPagamento } from "@/components/ui-extra/status-badge";
import { requireUsuario } from "@/lib/auth";
import { hojeISO, rotuloCompetencia } from "@/lib/financeiro";
import { formatBRL, formatData } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";
import type {
  Aluno,
  Anamnese,
  AvaliacaoFisica,
  Periodicidade,
  StatusPagamento as TStatusPagamento,
} from "@/lib/tipos";

import { AlunoForm } from "../aluno-form";
import { GerarAcesso } from "../gerar-acesso";
import { MatriculaCard, type MatriculaAtiva } from "../matricula-card";
import { BaixaButton } from "../../financeiro/baixa-button";

interface PagamentoAluno {
  id: string;
  competencia: string;
  vencimento: string;
  valor: number;
  status: TStatusPagamento;
  data_pagamento: string | null;
  forma_pagamento: string | null;
}

export default async function AlunoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUsuario(["admin"]);
  const { id } = await params;
  const hoje = hojeISO();

  const supabase = await createClient();
  const [
    { data: alunoData },
    { data: professoresData },
    { data: planosData },
    { data: matriculaData },
    { data: pagamentosData },
    { data: anamneseData },
    { data: avaliacoesData },
  ] = await Promise.all([
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
    supabase
      .from("pagamentos")
      .select(
        "id, competencia, vencimento, valor, status, data_pagamento, forma_pagamento",
      )
      .eq("aluno_id", id)
      .order("vencimento", { ascending: false })
      .limit(12),
    supabase.from("anamneses").select("*").eq("aluno_id", id).maybeSingle(),
    supabase
      .from("avaliacoes_fisicas")
      .select("*")
      .eq("aluno_id", id)
      .order("data", { ascending: false }),
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
  const pagamentos = (pagamentosData ?? []) as PagamentoAluno[];
  const anamnese = (anamneseData as Anamnese | null) ?? null;
  const avaliacoes = (avaliacoesData ?? []) as AvaliacaoFisica[];

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

        <Card className="overflow-hidden p-0">
          <CardHeader className="p-5">
            <CardTitle>Histórico de pagamentos</CardTitle>
          </CardHeader>
          {pagamentos.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">
              Nenhuma cobrança gerada. Matricule o aluno para gerar a primeira
              mensalidade.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competência</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagamentos.map((p) => {
                  const status: TStatusPagamento =
                    p.status === "pendente" && p.vencimento < hoje
                      ? "vencido"
                      : p.status;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{rotuloCompetencia(p.competencia)}</TableCell>
                      <TableCell>{formatData(p.vencimento)}</TableCell>
                      <TableCell>{formatBRL(p.valor)}</TableCell>
                      <TableCell>
                        <StatusPagamento status={status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {p.status === "pago" ? (
                          <span className="text-xs text-muted-foreground">
                            {p.forma_pagamento
                              ? `Pago · ${p.forma_pagamento}`
                              : "Pago"}
                          </span>
                        ) : (
                          <BaixaButton pagamentoId={p.id} />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
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

        <AcompanhamentoCards
          alunoId={aluno.id}
          anamnese={anamnese}
          avaliacoes={avaliacoes}
        />
      </div>
    </>
  );
}
