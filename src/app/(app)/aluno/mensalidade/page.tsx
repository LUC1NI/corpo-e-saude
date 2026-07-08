import { AlertCircle, CheckCircle2, Wallet } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { StatusPagamento } from "@/components/ui-extra/status-badge";
import { TabelaResponsiva } from "@/components/ui-extra/tabela-responsiva";
import { requireUsuario } from "@/lib/auth";
import { getAlunoAtual } from "@/lib/aluno";
import { hojeISO, rotuloCompetencia } from "@/lib/financeiro";
import { formatBRL, formatData } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";
import {
  ROTULO_PERIODICIDADE,
  type Periodicidade,
  type StatusPagamento as TStatusPagamento,
} from "@/lib/tipos";

import { PagamentoPix } from "./pagamento-pix";

interface PagamentoAluno {
  id: string;
  competencia: string;
  vencimento: string;
  valor: number;
  status: TStatusPagamento;
  data_pagamento: string | null;
  forma_pagamento: string | null;
}

interface MatriculaAtiva {
  data_proxima_cobranca: string;
  plano_nome: string;
  valor: number;
  periodicidade: Periodicidade;
}

export default async function AlunoMensalidadePage() {
  await requireUsuario(["aluno"]);
  const hoje = hojeISO();

  const aluno = await getAlunoAtual();
  let pagamentos: PagamentoAluno[] = [];
  let matricula: MatriculaAtiva | null = null;

  if (aluno) {
    const supabase = await createClient();
    const [{ data: pagamentosData }, { data: matriculaData }] =
      await Promise.all([
        supabase
          .from("pagamentos")
          .select(
            "id, competencia, vencimento, valor, status, data_pagamento, forma_pagamento",
          )
          .eq("aluno_id", aluno.id)
          .order("vencimento", { ascending: false })
          .limit(24),
        supabase
          .from("matriculas")
          .select("data_proxima_cobranca, planos(nome, valor, periodicidade)")
          .eq("aluno_id", aluno.id)
          .eq("status", "ativa")
          .maybeSingle(),
      ]);

    pagamentos = (pagamentosData ?? []) as PagamentoAluno[];
    if (matriculaData) {
      const plano = (
        matriculaData as unknown as {
          planos: { nome: string; valor: number; periodicidade: Periodicidade };
        }
      ).planos;
      matricula = {
        data_proxima_cobranca: matriculaData.data_proxima_cobranca as string,
        plano_nome: plano.nome,
        valor: plano.valor,
        periodicidade: plano.periodicidade,
      };
    }
  }

  const efetivo = (p: PagamentoAluno): TStatusPagamento =>
    p.status === "pendente" && p.vencimento < hoje ? "vencido" : p.status;

  const emAberto = pagamentos.filter((p) => efetivo(p) !== "pago");
  const totalAberto = emAberto.reduce((s, p) => s + p.valor, 0);
  const emDia = emAberto.length === 0;

  // O que o aluno paga agora: as pendências (se houver) ou a mensalidade do
  // plano ativo (quando está em dia e quer se adiantar).
  const valorPagar = !emDia ? totalAberto : (matricula?.valor ?? 0);
  const descricaoPagar = !emDia
    ? `${emAberto.length} mensalidade(s) em aberto · ${formatBRL(totalAberto)}`
    : matricula
      ? `Mensalidade do plano ${matricula.plano_nome}`
      : "";

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-xl font-bold">Sua mensalidade</h1>

      {/* Situação atual */}
      <section
        className={
          emDia
            ? "rounded-2xl bg-emerald-600 p-5 text-white shadow-sm"
            : "rounded-2xl bg-amber-500 p-5 text-white shadow-sm"
        }
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
            {emDia ? (
              <CheckCircle2 className="size-5" />
            ) : (
              <AlertCircle className="size-5" />
            )}
          </span>
          <div>
            <p className="text-lg font-bold">
              {emDia ? "Tudo em dia" : "Você tem pendências"}
            </p>
            <p className="text-sm text-white/80">
              {emDia
                ? "Nenhuma mensalidade em aberto. Obrigado!"
                : `${emAberto.length} mensalidade(s) em aberto · ${formatBRL(totalAberto)}`}
            </p>
          </div>
        </div>
      </section>

      {/* Como pagar (PIX) */}
      {valorPagar > 0 ? (
        <PagamentoPix valor={valorPagar} descricao={descricaoPagar} />
      ) : null}

      {/* Plano e próxima cobrança */}
      {matricula ? (
        <Card>
          <CardHeader>
            <CardTitle>Seu plano</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Plano</dt>
                <dd className="font-medium">{matricula.plano_nome}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Valor</dt>
                <dd className="font-medium">
                  {formatBRL(matricula.valor)}
                  <span className="text-muted-foreground">
                    {" "}
                    · {ROTULO_PERIODICIDADE[matricula.periodicidade]}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Próxima cobrança</dt>
                <dd className="font-medium">
                  {formatData(matricula.data_proxima_cobranca)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      ) : null}

      {/* Histórico */}
      <Card className="overflow-hidden p-0">
        <CardHeader className="p-5">
          <CardTitle>Histórico de mensalidades</CardTitle>
        </CardHeader>
        {pagamentos.length === 0 ? (
          <PageEmpty
            icone={Wallet}
            titulo="Nenhuma cobrança"
            descricao="Suas mensalidades aparecem aqui assim que forem geradas."
          />
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
                  cabecalho: "Situação",
                  alinhar: "right",
                  celula: (p) => <StatusPagamento status={efetivo(p)} />,
                },
              ]}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
