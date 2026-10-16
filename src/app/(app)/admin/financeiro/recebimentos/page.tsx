import { Banknote, CheckCircle2, CreditCard, Landmark, QrCode, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "@/components/ui-extra/link";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { StatCard } from "@/components/ui-extra/stat-card";
import { requireUsuario } from "@/lib/auth";

import { formatBRL, formatData, formatMesAno, plural } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";

import { NavFinanceiro } from "../nav-financeiro";
import { EmitirPendentesButton, NotaAcoes, type NotaResumo } from "../nota-acoes";
import { resolverMes } from "../periodo";
import { SeletorMes } from "../seletor-mes";
import { situacaoEmissao } from "@/lib/nfse/provedor";
import { carregarConfigFiscal } from "@/lib/nfse/servico";
import { exigir } from "@/lib/utils";

interface Recebido {
  id: string;
  aluno_id: string;
  competencia: string;
  valor: number;
  data_pagamento: string | null;
  forma_pagamento: string | null;
  alunos: { nome: string } | null;
}

const ICONE_FORMA: Record<string, LucideIcon> = {
  Pix: QrCode,
  Dinheiro: Banknote,
  "Cartão": CreditCard,
  "Transferência": Landmark,
};

export default async function RecebimentosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  await requireUsuario(["admin"]);
  const supabase = await createClient();
  const sp = await searchParams;
  const periodo = resolverMes(sp.mes);

  const res = await supabase
    .from("pagamentos")
    .select(
      "id, aluno_id, competencia, valor, data_pagamento, forma_pagamento, alunos(nome)",
    )
    .eq("status", "pago")
    .gte("data_pagamento", periodo.inicio)
    .lt("data_pagamento", periodo.fimExclusivo)
    .order("data_pagamento", { ascending: false })
    .limit(300);

  const recebidos = exigir(res, "lista") as unknown as Recebido[];

  // Notas dos pagamentos listados (1 consulta) + total pendente para o lote.
  const ids = recebidos.map((p) => p.id);
  const [{ data: notasData }, { count: pendentes }, configFiscal] = await Promise.all([
    ids.length
      ? supabase
          .from("notas_fiscais")
          .select("id, pagamento_id, status, numero, url_pdf, mensagem_erro, criado_em")
          .in("pagamento_id", ids)
          .order("criado_em", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase
      .from("notas_fiscais")
      .select("id", { count: "exact", head: true })
      .in("status", ["aguardando_configuracao", "erro"]),
    carregarConfigFiscal(supabase),
  ]);
  // Emissão desligada: nada de "Sem nota / Emitir" em cada linha (só as notas que já existem).
  const notasLigadas = situacaoEmissao(configFiscal).tipo !== "desativada";
  // A nota "da vez" é a não cancelada; se só houver canceladas, a mais recente.
  const notaPorPagamento = new Map<string, NotaResumo>();
  for (const n of (notasData ?? []) as (NotaResumo & { pagamento_id: string })[]) {
    const atual = notaPorPagamento.get(n.pagamento_id);
    if (!atual || (atual.status === "cancelada" && n.status !== "cancelada")) {
      notaPorPagamento.set(n.pagamento_id, n);
    }
  }
  const total = recebidos.reduce((s, p) => s + Number(p.valor), 0);

  // Quebra por forma de pagamento (Pix, Dinheiro, Cartão…).
  const porForma = new Map<string, { total: number; qtd: number }>();
  for (const p of recebidos) {
    const forma = p.forma_pagamento || "Não informada";
    const atual = porForma.get(forma) ?? { total: 0, qtd: 0 };
    atual.total += Number(p.valor);
    atual.qtd += 1;
    porForma.set(forma, atual);
  }
  const formas = [...porForma.entries()].sort((a, b) => b[1].total - a[1].total);

  return (
    <>
      <PageHeader
        titulo="Recebimentos"
        acoes={
          <SeletorMes periodo={periodo} base="/admin/financeiro/recebimentos" />
        }
      />
      <NavFinanceiro ativa="/admin/financeiro/recebimentos" />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          titulo={`Recebido em ${periodo.rotulo}`}
          valor={formatBRL(total)}
          icone={CheckCircle2}
          tomIcone="sucesso"
          rodape={plural(recebidos.length, "pagamento", "pagamentos")}
          className="col-span-2 xl:col-span-1"
        />
        {formas.slice(0, 3).map(([forma, f]) => (
          <StatCard
            key={forma}
            titulo={forma}
            valor={formatBRL(f.total)}
            icone={ICONE_FORMA[forma] ?? Wallet}
            tomIcone="primary"
            rodape={plural(f.qtd, "pagamento", "pagamentos")}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pagamentos confirmados</CardTitle>
          {notasLigadas ? (
            <div className="pt-2">
              <EmitirPendentesButton quantidade={pendentes ?? 0} />
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          {recebidos.length === 0 ? (
            <PageEmpty
              icone={Wallet}
              titulo="Nenhum recebimento neste mês"
              descricao="Use as setas acima para navegar entre os meses."
            />
          ) : (
            <ul className="divide-y rounded-lg border">
              {recebidos.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <Link
                    href={`/admin/alunos/${p.aluno_id}`}
                    className="min-w-0 rounded-md transition-colors hover:text-primary"
                  >
                    <p className="truncate text-sm font-medium">
                      {p.alunos?.nome ?? "Aluno"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Competência {formatMesAno(p.competencia)}
                      {p.data_pagamento
                        ? ` · pago ${formatData(p.data_pagamento)}`
                        : ""}
                    </p>
                  </Link>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    {p.forma_pagamento ? (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                        {p.forma_pagamento}
                      </span>
                    ) : null}
                    <span className="text-sm font-semibold tabular-nums text-emerald-700">
                      + {formatBRL(p.valor)}
                    </span>
                    {notasLigadas || notaPorPagamento.has(p.id) ? (
                      <div className="sm:max-w-72">
                        <NotaAcoes pagamentoId={p.id} nota={notaPorPagamento.get(p.id) ?? null} />
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
