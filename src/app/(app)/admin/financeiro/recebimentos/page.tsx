import { Banknote, CheckCircle2, CreditCard, Landmark, QrCode, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "@/components/ui-extra/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { StatCard } from "@/components/ui-extra/stat-card";
import { requireUsuario } from "@/lib/auth";
import { rotuloCompetencia } from "@/lib/financeiro";
import { formatBRL, formatData } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";

import { NavFinanceiro } from "../nav-financeiro";
import { resolverMes } from "../periodo";
import { SeletorMes } from "../seletor-mes";

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

  const { data } = await supabase
    .from("pagamentos")
    .select(
      "id, aluno_id, competencia, valor, data_pagamento, forma_pagamento, alunos(nome)",
    )
    .eq("status", "pago")
    .gte("data_pagamento", periodo.inicio)
    .lt("data_pagamento", periodo.fimExclusivo)
    .order("data_pagamento", { ascending: false })
    .limit(300);

  const recebidos = (data ?? []) as unknown as Recebido[];
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
        subtitulo="Tudo o que entrou no caixa, mês a mês, com a forma de pagamento."
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
          rodape={`${recebidos.length} pagamento(s)`}
          className="col-span-2 xl:col-span-1"
        />
        {formas.slice(0, 3).map(([forma, f]) => (
          <StatCard
            key={forma}
            titulo={forma}
            valor={formatBRL(f.total)}
            icone={ICONE_FORMA[forma] ?? Wallet}
            tomIcone="primary"
            rodape={`${f.qtd} pagamento(s)`}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pagamentos confirmados</CardTitle>
          <CardDescription>
            Ordenados do mais recente. Toque no nome para abrir o aluno.
          </CardDescription>
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
                <li key={p.id}>
                  <Link
                    href={`/admin/alunos/${p.aluno_id}`}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {p.alunos?.nome ?? "Aluno"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        Competência {rotuloCompetencia(p.competencia)}
                        {p.data_pagamento
                          ? ` · pago ${formatData(p.data_pagamento)}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {p.forma_pagamento ? (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                          {p.forma_pagamento}
                        </span>
                      ) : null}
                      <span className="text-sm font-semibold tabular-nums text-emerald-700">
                        + {formatBRL(p.valor)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
