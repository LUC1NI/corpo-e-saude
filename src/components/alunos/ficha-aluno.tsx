import { notFound } from "next/navigation";

import { BaixaButton } from "@/app/(app)/admin/financeiro/baixa-button";
import { DesfazerBaixaButton } from "@/app/(app)/admin/financeiro/desfazer-baixa-button";
import { ExcluirPagamentoButton } from "@/app/(app)/admin/financeiro/excluir-pagamento-button";
import { AlunoForm } from "@/app/(app)/admin/alunos/aluno-form";
import { ExcluirAlunoButton } from "@/app/(app)/admin/alunos/excluir-aluno-button";
import { GerarAcesso } from "@/app/(app)/admin/alunos/gerar-acesso";
import { MatriculaCard, type MatriculaAtiva } from "@/app/(app)/admin/alunos/matricula-card";
import { AcompanhamentoCards } from "@/components/acompanhamento/acompanhamento-cards";
import {
  AbasFicha,
  CabecalhoAluno,
  ChecklistAluno,
  resolverAba,
  type Aba,
} from "@/components/alunos/ficha";
import { HorariosDoAluno } from "@/components/alunos/horarios-do-aluno";
import { ExecucoesLista } from "@/components/treino/execucoes-lista";
import { TreinoPresencial } from "@/components/treino/treino-presencial";
import { TreinosEditor } from "@/components/treino/treinos-editor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPagamento } from "@/components/ui-extra/status-badge";
import { aguardandoPrimeiroAcesso } from "@/lib/acesso";
import { hojeISO } from "@/lib/financeiro";
import { formatBRL, formatDiaMes, formatMesAno, plural } from "@/lib/formato";
import { getFrequenciaDoAluno } from "@/lib/frequencia";
import { horariosComOcupacao, resumoHorarios } from "@/lib/horarios";
import { createClient } from "@/lib/supabase/server";
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
  TipoAluno,
} from "@/lib/tipos";

interface PagamentoAluno {
  id: string;
  competencia: string;
  vencimento: string;
  valor: number;
  status: TStatusPagamento;
  data_pagamento: string | null;
  forma_pagamento: string | null;
}

/**
 * Ficha do aluno (admin e professor): cabeçalho-resumo, checklist do que
 * falta e abas. Cada aba carrega só os próprios dados. Financeiro e dados
 * fiscais só existem para o admin (LGPD; RLS também barra o professor).
 */
export async function FichaAluno({
  papel,
  id,
  abaPedida,
}: {
  papel: "admin" | "professor";
  id: string;
  abaPedida?: string;
}) {
  const admin = papel === "admin";
  const base = admin ? `/admin/alunos/${id}` : `/professor/alunos/${id}`;
  const supabase = await createClient();
  const hoje = hojeISO();

  const [{ data: alunoData }, { data: vincData }, { data: anamCheck }, { count: avalCount }, frequencia] =
    await Promise.all([
      supabase.from("alunos").select("*, professores(nome)").eq("id", id).maybeSingle(),
      supabase.from("aluno_horarios").select("horario_id, horarios(dia_semana, hora_inicio)").eq("aluno_id", id),
      supabase.from("anamneses").select("id").eq("aluno_id", id).maybeSingle(),
      supabase.from("avaliacoes_fisicas").select("id", { count: "exact", head: true }).eq("aluno_id", id),
      getFrequenciaDoAluno(supabase, id, hoje),
    ]);
  if (!alunoData) notFound();
  const aluno = alunoData as Aluno & { professores: { nome: string } | null };
  const online = aluno.tipo === "online";

  const abas: Aba[] = [
    ...(admin ? (["financeiro"] as Aba[]) : []),
    ...(online && !admin ? (["treino", "saude"] as Aba[]) : (["saude", "treino"] as Aba[])),
    ...(online ? [] : (["horarios"] as Aba[])),
    "dados",
  ];
  const aba = resolverAba(abaPedida, abas);

  const vinculos = ((vincData ?? []) as unknown as {
    horario_id: string;
    horarios: { dia_semana: number; hora_inicio: string } | null;
  }[]).filter((v) => v.horarios);
  const horariosTexto = resumoHorarios(vinculos.map((v) => v.horarios!));

  // Situação financeira (só admin) para o cabeçalho e a checklist.
  let financeiro: { tom: "sucesso" | "alerta" | "perigo"; texto: string } | null = null;
  let temMatricula = true;
  if (admin) {
    const [{ data: abertos }, { count: matCount }] = await Promise.all([
      supabase.from("pagamentos").select("vencimento, valor").eq("aluno_id", id).neq("status", "pago").order("vencimento"),
      supabase.from("matriculas").select("id", { count: "exact", head: true }).eq("aluno_id", id).eq("status", "ativa"),
    ]);
    temMatricula = (matCount ?? 0) > 0;
    const lista = (abertos ?? []) as { vencimento: string; valor: number }[];
    const atrasadas = lista.filter((p) => p.vencimento < hoje);
    financeiro = atrasadas.length
      ? { tom: "perigo", texto: `Atrasado · ${formatBRL(atrasadas.reduce((s, p) => s + Number(p.valor), 0))}` }
      : lista.length
        ? { tom: "alerta", texto: `Vence ${formatDiaMes(lista[0]!.vencimento)}` }
        : temMatricula
          ? { tom: "sucesso", texto: "Em dia" }
          : null;
  }

  const checklist = [
    ...(admin ? [{ ok: temMatricula, texto: "Plano", href: `${base}?aba=financeiro` }] : []),
    { ok: !!anamCheck, texto: "Anamnese", href: `${base}?aba=saude#anamnese` },
    { ok: (avalCount ?? 0) > 0, texto: "1ª avaliação", href: `${base}?aba=saude#avaliacoes` },
    ...(online ? [] : [{ ok: vinculos.length > 0, texto: "Horários", href: `${base}?aba=horarios` }]),
    { ok: !!aluno.usuario_id, texto: "Acesso ao app", href: `${base}?aba=dados#acesso` },
  ];

  return (
    <>
      <CabecalhoAluno
        nome={aluno.nome}
        tipo={aluno.tipo}
        professorNome={aluno.professores?.nome ?? null}
        status={aluno.status}
        telefone={aluno.telefone}
        horarios={horariosTexto}
        frequencia={frequencia.freq}
        financeiro={financeiro}
      />
      <ChecklistAluno itens={checklist} />
      <AbasFicha base={base} atual={aba} abas={abas} />

      <div className="space-y-6">
        {aba === "financeiro" ? <AbaFinanceiro alunoId={id} nome={aluno.nome} hoje={hoje} tipo={aluno.tipo} /> : null}
        {aba === "saude" ? <AbaSaude alunoId={id} /> : null}
        {aba === "treino" ? <AbaTreino alunoId={id} online={online} /> : null}
        {aba === "horarios" ? (
          <Card>
            <CardHeader>
              <CardTitle>Horários fixos</CardTitle>
              <CardDescription>
                {frequencia.freq.pct !== null
                  ? `Veio a ${frequencia.freq.presente} de ${plural(frequencia.freq.esperado, "aula", "aulas")} nas últimas 8 semanas.`
                  : "As aulas da semana em que o aluno treina."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HorariosDoAluno
                alunoId={id}
                atuais={vinculos.map((v) => v.horario_id)}
                opcoes={aluno.professor_id ? await horariosComOcupacao(supabase, aluno.professor_id) : []}
                semProfessor={!aluno.professor_id}
              />
            </CardContent>
          </Card>
        ) : null}
        {aba === "dados" ? <AbaDados aluno={aluno} admin={admin} /> : null}
      </div>
    </>
  );
}

async function AbaFinanceiro({ alunoId, nome, hoje, tipo }: { alunoId: string; nome: string; hoje: string; tipo: TipoAluno }) {
  const supabase = await createClient();
  const [{ data: planosData }, { data: matriculaData }, { data: pagamentosData }] = await Promise.all([
    supabase
      .from("planos")
      .select("id, nome, valor, periodicidade")
      .eq("ativo", true)
      .or(`tipo_aluno.is.null,tipo_aluno.eq.${tipo}`)
      .order("nome"),
    supabase
      .from("matriculas")
      .select("id, data_proxima_cobranca, renovacao_automatica, planos(nome, valor, periodicidade)")
      .eq("aluno_id", alunoId)
      .eq("status", "ativa")
      .maybeSingle(),
    supabase
      .from("pagamentos")
      .select("id, competencia, vencimento, valor, status, data_pagamento, forma_pagamento")
      .eq("aluno_id", alunoId)
      .order("vencimento", { ascending: false })
      .limit(12),
  ]);
  const planos = (planosData ?? []) as { id: string; nome: string; valor: number; periodicidade: Periodicidade }[];
  const pagamentos = (pagamentosData ?? []) as PagamentoAluno[];
  let matricula: MatriculaAtiva | null = null;
  if (matriculaData) {
    const plano = (matriculaData as unknown as { planos: { nome: string; valor: number; periodicidade: Periodicidade } }).planos;
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
      <Card>
        <CardHeader>
          <CardTitle>Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <MatriculaCard alunoId={alunoId} planos={planos} matricula={matricula} />
        </CardContent>
      </Card>

      <Card className="gap-0 p-0">
        <CardHeader className="p-5 pb-2">
          <CardTitle>Mensalidades</CardTitle>
        </CardHeader>
        {pagamentos.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">Nenhuma cobrança ainda. Escolha um plano acima.</p>
        ) : (
          <ul className="divide-y px-5 pb-2">
            {pagamentos.map((p) => {
              const efetivo = p.status === "pendente" && p.vencimento < hoje ? "vencido" : p.status;
              return (
                <li key={p.id} className="flex min-h-16 flex-wrap items-center gap-x-2 gap-y-2 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{formatMesAno(p.competencia)}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.status === "pago"
                        ? `Pago ${p.data_pagamento ? `em ${formatDiaMes(p.data_pagamento)}` : ""}${p.forma_pagamento ? ` · ${p.forma_pagamento}` : ""}`
                        : `Vence ${formatDiaMes(p.vencimento)}`}
                    </p>
                  </div>
                  {/* Valor e situação empilhados à direita: o mês pago cabe numa linha só no celular. */}
                  <span className="flex flex-col items-end gap-1">
                    <span className="font-medium tabular-nums">{formatBRL(p.valor)}</span>
                    <StatusPagamento status={efetivo} />
                  </span>
                  {p.status !== "pago" ? (
                    <span className="flex w-full items-center justify-end gap-1 sm:w-auto">
                      <BaixaButton
                        pagamentoId={p.id}
                        aluno={nome}
                        competencia={p.competencia}
                        valor={Number(p.valor)}
                        rotulo={`Recebi ${formatBRL(Number(p.valor))}`}
                      />
                      <ExcluirPagamentoButton pagamentoId={p.id} />
                    </span>
                  ) : (
                    <DesfazerBaixaButton
                      compacto
                      pagamentoId={p.id}
                      descricao={`A mensalidade de ${formatMesAno(p.competencia)} (${formatBRL(p.valor)})`}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}

async function AbaSaude({ alunoId }: { alunoId: string }) {
  const supabase = await createClient();
  const [{ data: anamneseData }, { data: avaliacoesData }] = await Promise.all([
    supabase.from("anamneses").select("*").eq("aluno_id", alunoId).maybeSingle(),
    supabase.from("avaliacoes_fisicas").select("*").eq("aluno_id", alunoId).order("data", { ascending: false }),
  ]);
  return (
    <AcompanhamentoCards
      alunoId={alunoId}
      anamnese={(anamneseData as Anamnese | null) ?? null}
      avaliacoes={(avaliacoesData ?? []) as AvaliacaoFisica[]}
    />
  );
}

async function AbaTreino({ alunoId, online }: { alunoId: string; online: boolean }) {
  const [treinos, exercicios, modelos, execucoes] = await Promise.all([
    getTreinosDoAluno(alunoId),
    getExerciciosBiblioteca(),
    getModelosTreino(),
    online ? getExecucoesDoAluno(alunoId) : Promise.resolve([]),
  ]);
  return (
    <>
      {/* Sem card em volta: a ficha e a lista já são cards (evita card dentro de card no celular). */}
      <section id="treino" className="space-y-3">
        <h2 className="font-heading text-lg font-bold">Treino</h2>
        {online ? (
          <TreinosEditor alunoId={alunoId} treinos={treinos} exercicios={exercicios} modelos={modelos} />
        ) : (
          <TreinoPresencial alunoId={alunoId} treinos={treinos} exercicios={exercicios} modelos={modelos} />
        )}
      </section>
      {online ? (
        <section id="execucoes" className="space-y-3">
          <h2 className="font-heading text-lg font-bold">Treinos feitos pelo app</h2>
          <ExecucoesLista execucoes={execucoes} />
        </section>
      ) : null}
    </>
  );
}

async function AbaDados({ aluno, admin }: { aluno: Aluno; admin: boolean }) {
  const supabase = await createClient();
  const [aguardando, { data: professoresData }, { data: fiscalData }] = await Promise.all([
    aguardandoPrimeiroAcesso(aluno.usuario_id),
    admin
      ? supabase.from("professores").select("id, nome").eq("ativo", true).order("nome")
      : Promise.resolve({ data: [] }),
    admin
      ? supabase.from("alunos_dados_fiscais").select("*").eq("aluno_id", aluno.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return (
    <>
      <Card id="acesso" className="scroll-mt-32">
        <CardHeader>
          <CardTitle>Acesso ao app</CardTitle>
        </CardHeader>
        <CardContent>
          <GerarAcesso
            alunoId={aluno.id}
            temAcesso={Boolean(aluno.usuario_id)}
            aguardandoPrimeiroAcesso={aguardando}
            email={aluno.email}
            nome={aluno.nome}
            telefone={aluno.telefone}
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
            professores={(professoresData ?? []) as { id: string; nome: string }[]}
            mostrarProfessor={admin}
            mostrarFiscal={admin}
            destinoBase={admin ? `/admin/alunos/${aluno.id}` : `/professor/alunos/${aluno.id}`}
            fiscalInicial={fiscalData ?? undefined}
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

      {admin ? (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">Excluir aluno</CardTitle>
            <CardDescription>Apaga o aluno e todo o histórico. Para pausar, use “Inativo” em Dados.</CardDescription>
          </CardHeader>
          <CardContent>
            <ExcluirAlunoButton alunoId={aluno.id} nome={aluno.nome} />
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
