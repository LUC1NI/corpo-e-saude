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
import { StatusPagamento } from "@/components/ui-extra/status-badge";
import { TabelaResponsiva } from "@/components/ui-extra/tabela-responsiva";
import { aguardandoPrimeiroAcesso } from "@/lib/acesso";
import { requireUsuario } from "@/lib/auth";
import { hojeISO, rotuloCompetencia } from "@/lib/financeiro";
import { formatBRL, formatData } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";
import { ExecucoesLista } from "@/components/treino/execucoes-lista";
import {
  getExecucoesDoAluno,
  getExerciciosBiblioteca,
  getModelosTreino,
  getTreinosDoAluno,
} from "@/lib/treino";
import type {
  Aluno,
  Anamnese,
  AvaliacaoFisica,
  Periodicidade,
  StatusPagamento as TStatusPagamento,
} from "@/lib/tipos";

import { AlunoForm } from "../aluno-form";
import { ExcluirAlunoButton } from "../excluir-aluno-button";
import { GerarAcesso } from "../gerar-acesso";
import { MatriculaCard, type MatriculaAtiva } from "../matricula-card";
import { BaixaButton } from "../../financeiro/baixa-button";
import { ExcluirPagamentoButton } from "../../financeiro/excluir-pagamento-button";

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
    treinos,
    exercicios,
    modelos,
    execucoes,
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
    getTreinosDoAluno(id),
    getExerciciosBiblioteca(),
    getModelosTreino(),
    getExecucoesDoAluno(id),
  ]);

  if (!alunoData) notFound();
  const aluno = alunoData as Aluno;
  const online = aluno.tipo === "online";
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
  const aguardandoAcesso = await aguardandoPrimeiroAcesso(aluno.usuario_id);

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
            <div className="p-3 sm:p-0">
              <TabelaResponsiva
                dados={pagamentos}
                getKey={(p) => p.id}
                colunas={[
                  {
                    cabecalho: "Competência",
                    principal: true,
                    celula: (p) => rotuloCompetencia(p.competencia),
                  },
                  {
                    cabecalho: "Vencimento",
                    celula: (p) => formatData(p.vencimento),
                  },
                  { cabecalho: "Valor", celula: (p) => formatBRL(p.valor) },
                  {
                    cabecalho: "Status",
                    celula: (p) => (
                      <StatusPagamento
                        status={
                          p.status === "pendente" && p.vencimento < hoje
                            ? "vencido"
                            : p.status
                        }
                      />
                    ),
                  },
                  {
                    cabecalho: "Ação",
                    alinhar: "right",
                    semRotuloMobile: true,
                    celula: (p) =>
                      p.status === "pago" ? (
                        <span className="text-xs text-muted-foreground">
                          {p.forma_pagamento
                            ? `Pago · ${p.forma_pagamento}`
                            : "Pago"}
                        </span>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <BaixaButton pagamentoId={p.id} />
                          <ExcluirPagamentoButton pagamentoId={p.id} />
                        </div>
                      ),
                  },
                ]}
              />
            </div>
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

        <Card id="treino">
          <CardHeader>
            <CardTitle>
              {online ? "Ficha de treino" : "Ficha de treino (opcional)"}
            </CardTitle>
            <CardDescription>
              {online
                ? "Aplique um treino pronto e ajuste, ou monte do zero: dias de treino (A/B/C) e exercícios. O aluno treina pelo app e envia o retorno."
                : "Aluno presencial: o treino é conduzido na aula. Prescrever aqui é opcional — se preencher, o aluno vê a ficha no app para consultar; se deixar em branco, ele vê um aviso de que o treino é no estúdio."}
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

        {/* Retorno do modo treino (app): só o aluno online registra execuções. */}
        {online ? (
          <Card id="execucoes">
            <CardHeader>
              <CardTitle>Treinos realizados</CardTitle>
              <CardDescription>
                Retorno do aluno pelo aplicativo: treinos concluídos, duração,
                séries e observações.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExecucoesLista execucoes={execucoes} />
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">Zona de risco</CardTitle>
            <CardDescription>
              Excluir o aluno remove permanentemente todo o histórico vinculado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExcluirAlunoButton alunoId={aluno.id} nome={aluno.nome} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
