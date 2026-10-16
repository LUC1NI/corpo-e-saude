import { addDays, format, parseISO, startOfMonth, subMonths } from "date-fns";
import { AlertTriangle, ArrowRight, CalendarCheck, CheckCircle2, Clock, Plus, Users, Wallet } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AvatarIniciais } from "@/components/ui-extra/avatar-iniciais";
import Link from "@/components/ui-extra/link";
import { PageHeader } from "@/components/ui-extra/page-header";
import { requireUsuario } from "@/lib/auth";
import { agruparPorAluno, type CobrancaAberta } from "@/lib/cobranca";
import { agoraNoEstudio, hojeISO } from "@/lib/financeiro";
import { formatBRL, formatDataExtenso, plural } from "@/lib/formato";
import { dividirAulasDoDia } from "@/lib/historico-aulas";
import { executarRenovacao } from "@/lib/renovacao";
import { createClient } from "@/lib/supabase/server";
import { horaCurta } from "@/lib/tipos";
import { cn, exigir } from "@/lib/utils";

import { ReceberPorAluno } from "./financeiro/receber-por-aluno";
import { FaturamentoChart, type PontoFaturamento } from "./faturamento-chart";

const fmtMes = new Intl.DateTimeFormat("pt-BR", { month: "short" });
const mesCurto = (d: Date) => {
  const m = fmtMes.format(d).replace(".", "");
  return m.charAt(0).toUpperCase() + m.slice(1);
};

export default async function AdminInicio() {
  const usuario = await requireUsuario(["admin"]);
  const supabase = await createClient();
  const agora = agoraNoEstudio();
  const hoje = hojeISO();
  const inicioMes = `${hoje.slice(0, 7)}-01`;
  const inicio6Meses = format(startOfMonth(subMonths(parseISO(hoje), 5)), "yyyy-MM-dd");
  const ate7dias = format(addDays(parseISO(hoje), 7), "yyyy-MM-dd");

  // Gera cobranças que chegaram (idempotente) para o "Receber" estar em dia.
  try {
    await executarRenovacao(supabase);
  } catch {
    /* segue com o que existe */
  }

  const [abertosRes, mesRes, recebidoRes, despesasRes, historicoRes, aulasRes, alunosAtivos] =
    await Promise.all([
      supabase
        .from("pagamentos")
        .select("id, aluno_id, competencia, vencimento, valor, alunos(nome, telefone)")
        .in("status", ["pendente", "vencido"])
        .lte("vencimento", ate7dias)
        .order("vencimento"),
      supabase.from("pagamentos").select("valor, status").eq("competencia", inicioMes),
      supabase.from("pagamentos").select("valor").eq("status", "pago").gte("data_pagamento", inicioMes),
      supabase.from("despesas").select("valor").gte("data", inicioMes),
      supabase.from("pagamentos").select("valor, data_pagamento").eq("status", "pago").gte("data_pagamento", inicio6Meses),
      supabase
        .from("horarios")
        .select("id, hora_inicio, hora_fim, capacidade, professores(nome), aluno_horarios(alunos(id, nome))")
        .eq("dia_semana", agora.getDay())
        .order("hora_inicio"),
      supabase.from("alunos").select("id", { count: "exact", head: true }).eq("status", "ativo"),
    ]);

  const abertos = exigir(abertosRes, "cobranças") as unknown as CobrancaAberta[];
  const mes = exigir(mesRes, "mês") as { valor: number; status: string }[];
  const soma = (l: { valor: number }[]) => l.reduce((s, p) => s + Number(p.valor), 0);
  const previsto = soma(mes);
  const recebido = soma(exigir(recebidoRes, "recebimentos") as { valor: number }[]);
  const despesas = soma(exigir(despesasRes, "despesas") as { valor: number }[]);
  const resultado = recebido - despesas;
  // Mesma conta do Mês a mês: mensalidades DESTE mês já pagas ÷ previstas (não o caixa todo).
  const pagoDoMes = soma(mes.filter((p) => p.status === "pago"));
  const pct = previsto > 0 ? Math.min(100, Math.round((pagoDoMes / previsto) * 100)) : 0;

  // Receber: agrupado por aluno (atrasados primeiro, depois vencendo em 7 dias).
  const grupos = agruparPorAluno(abertos, hoje);
  const atrasados = grupos.filter((g) => g.atrasado);
  const totalAtraso = atrasados.reduce((s, g) => s + soma(g.itens.filter((p) => p.vencimento < hoje)), 0);

  // Série de 6 meses (recebido por mês de pagamento).
  const porMes = new Map<string, number>();
  for (const p of exigir(historicoRes, "histórico") as { valor: number; data_pagamento: string }[]) {
    const k = p.data_pagamento.slice(0, 7);
    porMes.set(k, (porMes.get(k) ?? 0) + Number(p.valor));
  }
  const serieCompleta: PontoFaturamento[] = Array.from({ length: 6 }, (_, i) => {
    const d = startOfMonth(subMonths(parseISO(hoje), 5 - i));
    return { mes: mesCurto(d), valor: porMes.get(format(d, "yyyy-MM")) ?? 0 };
  });
  // Começa no primeiro mês com recebimento (estúdio novo não vê meses vazios).
  const primeiroComDado = serieCompleta.findIndex((p) => p.valor > 0);
  const serie = primeiroComDado > 0 ? serieCompleta.slice(primeiroComDado) : serieCompleta;

  // Aulas de hoje do studio inteiro, agrupadas por horário.
  type Aula = { id: string; hora_inicio: string; hora_fim: string; professor: string; turma: { id: string; nome: string }[] };
  const aulas: Aula[] = ((aulasRes.data ?? []) as unknown as {
    id: string;
    hora_inicio: string;
    hora_fim: string;
    professores: { nome: string } | null;
    aluno_horarios: { alunos: { id: string; nome: string } | null }[];
  }[])
    .map((h) => ({
      id: h.id,
      hora_inicio: h.hora_inicio,
      hora_fim: h.hora_fim,
      professor: h.professores?.nome.split(" ")[0] ?? "",
      turma: h.aluno_horarios.map((v) => v.alunos).filter((a): a is { id: string; nome: string } => !!a),
    }))
    .filter((a) => a.turma.length > 0);
  const dia = dividirAulasDoDia(aulas, format(agora, "HH:mm"));
  const agoraLista = aulas.filter((a) => dia.agora && a.hora_inicio === dia.agora.hora_inicio);
  const seguirLista = aulas.filter((a) => dia.aSeguir && a.hora_inicio === dia.aSeguir.hora_inicio);

  const hojeExtenso = formatDataExtenso(agora);

  function LinhaAula({ a, destaque }: { a: Aula; destaque?: boolean }) {
    return (
      <div className={cn("flex items-center gap-3 rounded-xl p-3", destaque ? "bg-primary/5 ring-1 ring-primary/30" : "bg-secondary/50")}>
        <span className="w-14 shrink-0 font-heading text-lg font-bold tabular-nums">{horaCurta(a.hora_inicio)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{a.professor}</p>
          <p className="truncate text-sm text-muted-foreground">{a.turma.map((t) => t.nome.split(" ")[0]).join(", ")}</p>
        </div>
        <span className="flex -space-x-1.5">
          {a.turma.slice(0, 2).map((t) => (
            <AvatarIniciais key={t.id} nome={t.nome} tamanho="sm" className="ring-2 ring-card" />
          ))}
          {a.turma.length > 2 ? (
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold ring-2 ring-card">
              +{a.turma.length - 2}
            </span>
          ) : null}
        </span>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        titulo={`Olá, ${usuario.nome.split(" ")[0].replace(/\s*\(.*\)$/, "")}`}
        subtitulo={hojeExtenso[0]!.toUpperCase() + hojeExtenso.slice(1)}
        acoes={
          <div className="flex gap-2">
            <Link href="/admin/financeiro#despesa" className={buttonVariants({ variant: "outline" })}>
              <Plus className="size-4" />
              Despesa
            </Link>
            <Link href="/admin/alunos/novo" className={buttonVariants()}>
              <Plus className="size-4" />
              Aluno
            </Link>
          </div>
        }
      />

      {/* Mês em números */}
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Link href="/admin/financeiro/recebimentos" className="col-span-2 xl:col-span-1">
          <Card className="h-full gap-2 p-4 transition-shadow hover:shadow-md">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><CheckCircle2 className="size-4 text-emerald-600" />Entrou no caixa</p>
            <p className="font-heading text-2xl font-bold tabular-nums">{formatBRL(recebido)}</p>
            <div className="h-2 overflow-hidden rounded-full bg-secondary" aria-hidden>
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-sm text-muted-foreground">{pct}% das mensalidades pagas</p>
          </Card>
        </Link>
        <Link href="/admin/financeiro/em-aberto">
          <Card className={cn("h-full gap-1 p-4 transition-shadow hover:shadow-md", totalAtraso > 0 && "border-red-200 bg-red-50/60")}>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><AlertTriangle className="size-4 text-red-600" />Em atraso</p>
            <p className={cn("font-heading text-xl font-bold whitespace-nowrap tabular-nums sm:text-2xl", totalAtraso > 0 && "text-red-700")}>{formatBRL(totalAtraso)}</p>
            <p className="text-sm text-muted-foreground">{atrasados.length === 0 ? "Ninguém devendo 🎉" : plural(atrasados.length, "aluno", "alunos")}</p>
          </Card>
        </Link>
        <Link href="/admin/financeiro/mes">
          <Card className="h-full gap-1 p-4 transition-shadow hover:shadow-md">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Wallet className="size-4 text-primary" />Resultado do mês</p>
            {/* Número neutro: negativo no começo do mês é normal (aluguel antes das mensalidades). */}
            <p className="font-heading text-xl font-bold whitespace-nowrap tabular-nums sm:text-2xl">{formatBRL(resultado)}</p>
            <p className="text-sm text-muted-foreground">
              <span className={cn("mr-1 rounded-full px-1.5 py-0.5 text-xs font-semibold", resultado < 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700")}>
                {resultado < 0 ? "negativo" : "positivo"}
              </span>
              {formatBRL(despesas)} em despesas
            </p>
          </Card>
        </Link>
        <Link href="/admin/alunos" className="hidden xl:block">
          <Card className="h-full gap-1 p-4 transition-shadow hover:shadow-md">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Users className="size-4 text-primary" />Alunos ativos</p>
            <p className="font-heading text-2xl font-bold tabular-nums">{alunosAtivos.count ?? 0}</p>
            <p className="text-sm text-muted-foreground">no estúdio e online</p>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]">
        {/* A receber (no celular vem depois das aulas de hoje, que são curtas) */}
        <Card className="order-2 gap-0 p-0 lg:order-none">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="font-heading text-base font-bold">A receber</h2>
            <Link href="/admin/financeiro/em-aberto" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary sm:min-h-0">
              Ver tudo <ArrowRight className="size-4" />
            </Link>
          </div>
          {grupos.length === 0 ? (
            <p className="px-5 pb-5 text-muted-foreground">Nada para receber nos próximos 7 dias. ✓</p>
          ) : (
            <ReceberPorAluno
              grupos={grupos.slice(0, 8)}
              hoje={hoje}
              className="border-t"
              itemClassName={(i) => (i >= 4 ? "hidden lg:block" : undefined)}
            />
          )}
        </Card>

        <div className="contents lg:block lg:space-y-5">
          {/* Aulas de hoje */}
          <Card className="order-1 gap-3 p-5 lg:order-none">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-base font-bold">Aulas de hoje</h2>
              <Link href="/admin/presenca" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary sm:min-h-0">
                <CalendarCheck className="size-4" /> Presença
              </Link>
            </div>
            {agoraLista.length > 0 ? (
              <>
                <p className="text-xs font-bold tracking-wider text-primary uppercase">Agora</p>
                {agoraLista.map((a) => <LinhaAula key={a.id} a={a} destaque />)}
              </>
            ) : null}
            {seguirLista.length > 0 ? (
              <>
                <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">A seguir</p>
                {seguirLista.map((a) => <LinhaAula key={a.id} a={a} />)}
              </>
            ) : null}
            {agoraLista.length + seguirLista.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="size-4" />
                {aulas.length === 0 ? "Nenhuma aula com alunos hoje." : "As aulas de hoje já terminaram."}
              </p>
            ) : null}
          </Card>

          {/* Recebido por mês */}
          <Card className="order-3 gap-0 lg:order-none">
            <CardHeader>
              <h2 className="font-heading text-base font-bold">Recebido por mês</h2>
            </CardHeader>
            <CardContent>
              <FaturamentoChart dados={serie} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
