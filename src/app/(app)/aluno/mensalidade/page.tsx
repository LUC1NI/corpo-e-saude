import { AlertCircle, CalendarClock, CheckCircle2, FileDown, Wallet } from "lucide-react";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { StatusPagamento } from "@/components/ui-extra/status-badge";
import { textosMensalidade } from "@/components/aluno/situacao-mensalidade";
import { AtivarNotificacoes } from "@/components/pwa/ativar-notificacoes";
import { requireUsuario } from "@/lib/auth";
import { getAlunoAtual } from "@/lib/aluno";
import { hojeISO, precisaPagar, situacaoMensalidade } from "@/lib/financeiro";
import { formatBRL, formatDiaMes, formatMesAno } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";
import {
  type Periodicidade,
  type StatusPagamento as TStatusPagamento,
} from "@/lib/tipos";
import { cn } from "@/lib/utils";

import { PagamentoPix } from "./pagamento-pix";

const POR_PERIODO: Record<Periodicidade, string> = {
  mensal: "mês",
  trimestral: "trimestre",
  semestral: "semestre",
  anual: "ano",
};

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
  const pdfPorPagamento = new Map<string, string>();

  if (aluno) {
    const supabase = await createClient();
    const [{ data: pagamentosData }, { data: matriculaData }, { data: notasData }] =
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
        // RLS: o aluno só enxerga as próprias notas AUTORIZADAS.
        supabase
          .from("notas_fiscais")
          .select("pagamento_id, url_pdf")
          .eq("aluno_id", aluno.id)
          .eq("status", "autorizada"),
      ]);
    for (const n of (notasData ?? []) as { pagamento_id: string; url_pdf: string | null }[]) {
      if (n.url_pdf) pdfPorPagamento.set(n.pagamento_id, n.url_pdf);
    }

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
  const situacao = situacaoMensalidade(emAberto, hoje);
  const { tom, titulo, detalhe } = textosMensalidade(situacao);
  const agir = precisaPagar(situacao);
  const HeroIcone = tom === "ok" ? CheckCircle2 : tom === "aviso" ? CalendarClock : AlertCircle;

  // Há cobrança em aberto: paga ela (mesmo adiantado). Sem nenhuma: o plano.
  const valorPagar = situacao.tipo !== "em_dia" ? situacao.total : (matricula?.valor ?? 0);

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-xl font-bold">Mensalidade</h1>

      {/* Situação atual */}
      <section
        className={cn(
          "rounded-2xl p-5 text-white shadow-sm",
          tom === "ok" && "bg-brand-navy",
          tom === "aviso" && "bg-amber-700",
          tom === "atraso" && "bg-red-700",
        )}
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex size-11 shrink-0 items-center justify-center rounded-xl",
              tom === "ok" ? "bg-emerald-500" : "bg-white/15",
            )}
          >
            <HeroIcone className="size-6" />
          </span>
          <div>
            <p className="text-lg font-bold">{titulo}</p>
            <p className="text-white">{detalhe}</p>
          </div>
        </div>
        {valorPagar > 0 ? (
          <div className="mt-4">
            <PagamentoPix
              valor={valorPagar}
              descricao={agir ? detalhe : `Mensalidade do plano ${matricula?.plano_nome ?? ""}`}
              variante={agir ? "destaque" : "discreto"}
              tamanho={agir ? "lg" : "default"}
            />
          </div>
        ) : null}
      </section>

      {/* Plano */}
      {matricula ? (
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="font-semibold">{matricula.plano_nome}</p>
          <p className="text-sm text-muted-foreground">
            {formatBRL(matricula.valor)} por {POR_PERIODO[matricula.periodicidade]} · renova automaticamente
          </p>
        </div>
      ) : null}

      {/* Histórico */}
      <Card className="gap-0 p-0">
        <CardHeader className="p-5 pb-2">
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        {pagamentos.length === 0 ? (
          <PageEmpty
            icone={Wallet}
            titulo="Nenhuma cobrança ainda"
            descricao="Suas mensalidades aparecem aqui assim que forem geradas."
          />
        ) : (
          <ul className="divide-y px-5 pb-2">
            {pagamentos.map((p) => {
              const pdf = pdfPorPagamento.get(p.id);
              return (
                <li key={p.id} className="flex min-h-14 items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{formatMesAno(p.competencia)}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.data_pagamento
                        ? `Pago em ${formatDiaMes(p.data_pagamento)}`
                        : `Vence ${formatDiaMes(p.vencimento)}`}
                    </p>
                  </div>
                  <span className="font-medium tabular-nums">{formatBRL(p.valor)}</span>
                  <span className="flex w-20 justify-end">
                    <StatusPagamento status={efetivo(p)} />
                  </span>
                  {pdf ? (
                    <a
                      href={pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Baixar nota fiscal de ${formatMesAno(p.competencia)}`}
                      className="inline-flex size-11 items-center justify-center rounded-lg text-primary hover:bg-secondary"
                    >
                      <FileDown className="size-5" />
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <AtivarNotificacoes />
    </div>
  );
}
