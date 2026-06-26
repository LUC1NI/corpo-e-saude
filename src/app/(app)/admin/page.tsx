import { format, startOfMonth, subMonths } from "date-fns";
import { AlertTriangle, CheckCircle2, TrendingUp, Users } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
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
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { StatCard } from "@/components/ui-extra/stat-card";
import { StatusPagamento } from "@/components/ui-extra/status-badge";
import { requireUsuario } from "@/lib/auth";
import { formatBRL, formatData, formatDataExtenso } from "@/lib/formato";
import { hojeISO } from "@/lib/financeiro";
import { createClient } from "@/lib/supabase/server";
import type { StatusPagamento as TStatusPagamento } from "@/lib/tipos";
import { cn } from "@/lib/utils";

import { FaturamentoChart, type PontoFaturamento } from "./faturamento-chart";

const fmtMes = new Intl.DateTimeFormat("pt-BR", { month: "short" });
function mesCurto(d: Date): string {
  const s = fmtMes.format(d).replace(".", "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface VencendoItem {
  id: string;
  aluno_id: string;
  competencia: string;
  vencimento: string;
  valor: number;
  status: TStatusPagamento;
  alunos: { nome: string } | null;
}

export default async function AdminDashboard() {
  await requireUsuario(["admin"]);
  const supabase = await createClient();
  const hoje = hojeISO();
  const agora = new Date();
  const inicioMes = format(startOfMonth(agora), "yyyy-MM-dd");
  const inicio6Meses = format(startOfMonth(subMonths(agora, 5)), "yyyy-MM-dd");

  const [
    { count: alunosAtivos },
    { data: mesData },
    { data: vencendoData },
    { data: historicoData },
  ] = await Promise.all([
    supabase
      .from("alunos")
      .select("id", { count: "exact", head: true })
      .eq("status", "ativo"),
    supabase.from("pagamentos").select("valor, status").eq("competencia", inicioMes),
    supabase
      .from("pagamentos")
      .select("id, aluno_id, competencia, vencimento, valor, status, alunos(nome)")
      .in("status", ["pendente", "vencido"])
      .order("vencimento")
      .limit(5),
    supabase
      .from("pagamentos")
      .select("valor, competencia, status")
      .gte("competencia", inicio6Meses)
      .eq("status", "pago"),
  ]);

  const mes = (mesData ?? []) as { valor: number; status: TStatusPagamento }[];
  const vencendo = (vencendoData ?? []) as unknown as VencendoItem[];
  const historico = (historicoData ?? []) as {
    valor: number;
    competencia: string;
  }[];

  const faturamentoMes = mes.reduce((s, p) => s + Number(p.valor), 0);
  const recebidoMes = mes
    .filter((p) => p.status === "pago")
    .reduce((s, p) => s + Number(p.valor), 0);

  // Inadimplentes: alunos com cobrança vencida (consulta separada e enxuta).
  const { data: vencidosData } = await supabase
    .from("pagamentos")
    .select("aluno_id")
    .or(`status.eq.vencido,and(status.eq.pendente,vencimento.lt.${hoje})`);
  const inadimplentes = new Set(
    ((vencidosData ?? []) as { aluno_id: string }[]).map((p) => p.aluno_id),
  ).size;

  // Série dos últimos 6 meses (recebido por competência).
  const porMes = new Map<string, number>();
  for (const p of historico) {
    porMes.set(
      p.competencia,
      (porMes.get(p.competencia) ?? 0) + Number(p.valor),
    );
  }
  const serie: PontoFaturamento[] = Array.from({ length: 6 }, (_, i) => {
    const d = startOfMonth(subMonths(agora, 5 - i));
    const chave = format(d, "yyyy-MM-dd");
    return { mes: mesCurto(d), valor: porMes.get(chave) ?? 0 };
  });

  const hojeExtenso = formatDataExtenso(agora);

  return (
    <>
      <PageHeader
        titulo="Visão Geral"
        subtitulo={hojeExtenso[0]!.toUpperCase() + hojeExtenso.slice(1)}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          titulo="Alunos ativos"
          valor={String(alunosAtivos ?? 0)}
          icone={Users}
          tomIcone="primary"
        />
        <StatCard
          titulo="Faturamento do mês"
          valor={formatBRL(faturamentoMes)}
          icone={TrendingUp}
          tomIcone="sucesso"
        />
        <StatCard
          titulo="Recebido no mês"
          valor={formatBRL(recebidoMes)}
          icone={CheckCircle2}
          tomIcone="sucesso"
        />
        <StatCard
          titulo="Inadimplentes"
          valor={String(inadimplentes)}
          icone={AlertTriangle}
          tomIcone="perigo"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Faturamento — últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <FaturamentoChart dados={serie} />
          </CardContent>
        </Card>

        <Card className="overflow-hidden p-0">
          <CardHeader className="flex-row items-center justify-between p-5">
            <CardTitle>Mensalidades vencendo</CardTitle>
            <Link
              href="/admin/financeiro"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Ver todas
            </Link>
          </CardHeader>
          {vencendo.length === 0 ? (
            <PageEmpty
              icone={CheckCircle2}
              titulo="Tudo em dia"
              descricao="Nenhuma mensalidade pendente."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vencendo.map((p) => {
                  const status: TStatusPagamento =
                    p.status === "pendente" && p.vencimento < hoje
                      ? "vencido"
                      : p.status;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.alunos?.nome ?? "—"}
                      </TableCell>
                      <TableCell>{formatData(p.vencimento)}</TableCell>
                      <TableCell>{formatBRL(p.valor)}</TableCell>
                      <TableCell>
                        <StatusPagamento status={status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
