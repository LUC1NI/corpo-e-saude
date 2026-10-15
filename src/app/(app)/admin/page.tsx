import { addDays, format, parseISO, startOfMonth, subMonths } from "date-fns";
import { AlertTriangle, ArrowRight, CalendarCheck, CheckCircle2, Clock, Plus, Receipt, Users, Wallet } from "lucide-react";

import { CNPJ } from "@/components/landing/dados";
import { IconeWhatsApp } from "@/components/landing/icone-whatsapp";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AvatarIniciais } from "@/components/ui-extra/avatar-iniciais";
import Link from "@/components/ui-extra/link";
import { PageHeader } from "@/components/ui-extra/page-header";
import { requireUsuario } from "@/lib/auth";
import { agoraNoEstudio, hojeISO } from "@/lib/financeiro";
import { formatBRL, formatDataExtenso, formatDiaMes, formatMesAno, plural } from "@/lib/formato";
import { dividirAulasDoDia } from "@/lib/historico-aulas";
import { executarRenovacao } from "@/lib/renovacao";
import { createClient } from "@/lib/supabase/server";
import { horaCurta } from "@/lib/tipos";
import { cn, exigir } from "@/lib/utils";

import { BaixaButton } from "./financeiro/baixa-button";
import { FaturamentoChart, type PontoFaturamento } from "./faturamento-chart";

const fmtMes = new Intl.DateTimeFormat("pt-BR", { month: "short" });
const mesCurto = (d: Date) => {
  const m = fmtMes.format(d).replace(".", "");
  return m.charAt(0).toUpperCase() + m.slice(1);
};

interface Aberto {
  id: string;
  aluno_id: string;
  competencia: string;
  vencimento: string;
  valor: number;
  alunos: { nome: string; telefone: string | null } | null;
}

/** Mensagem pronta de cobrança gentil para o WhatsApp do aluno. */
function linkCobranca(nome: string, telefone: string | null, itens: Aberto[]): string {
  const total = itens.reduce((s, p) => s + Number(p.valor), 0);
  const meses = itens.map((p) => formatMesAno(p.competencia)).join(", ");
  const texto = [
    `Olá, ${nome.split(" ")[0]}! Tudo bem? 😊`,
    `Passando para lembrar da mensalidade de ${meses} (${formatBRL(total)}).`,
    `Pix (CNPJ): ${CNPJ}. Se já pagou, me manda o comprovante e eu dou baixa. Obrigado!`,
  ].join("\n");
  const digitos = (telefone ?? "").replace(/\D/g, "");
  const fone = digitos.length >= 10 ? (digitos.startsWith("55") && digitos.length > 11 ? digitos : `55${digitos}`) : "";
  return `https://wa.me/${fone}?text=${encodeURIComponent(texto)}`;
}

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

  const [abertosRes, mesRes, recebidoRes, despesasRes, historicoRes, aulasRes, presRes, alunosAtivos] =
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
      supabase.from("presencas").select("hora, professor_id").eq("data", hoje),
      supabase.from("alunos").select("id", { count: "exact", head: true }).eq("status", "ativo"),
    ]);

  const abertos = exigir(abertosRes, "cobranças") as unknown as Aberto[];
  const mes = exigir(mesRes, "mês") as { valor: number; status: string }[];
  const soma = (l: { valor: number }[]) => l.reduce((s, p) => s + Number(p.valor), 0);
  const previsto = soma(mes);
  const recebido = soma(exigir(recebidoRes, "recebimentos") as { valor: number }[]);
  const despesas = soma(exigir(despesasRes, "despesas") as { valor: number }[]);
  const resultado = recebido - despesas;
  const pct = previsto > 0 ? Math.min(100, Math.round((recebido / previsto) * 100)) : 0;

  // Receber: agrupado por aluno (atrasados primeiro, depois vencendo em 7 dias).
  const porAluno = new Map<string, { nome: string; telefone: string | null; itens: Aberto[] }>();
  for (const p of abertos) {
    const g = porAluno.get(p.aluno_id) ?? { nome: p.alunos?.nome ?? "Aluno", telefone: p.alunos?.telefone ?? null, itens: [] };
    g.itens.push(p);
    porAluno.set(p.aluno_id, g);
  }
  const grupos = [...porAluno.entries()].map(([id, g]) => ({
    id,
    ...g,
    total: soma(g.itens),
    atrasado: g.itens.some((p) => p.vencimento < hoje),
  }));
  const atrasados = grupos.filter((g) => g.atrasado);
  const vencendo = grupos.filter((g) => !g.atrasado);
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
  const presentesHoje = (presRes.data ?? []).length;

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
              <Receipt className="size-4" />
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
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><CheckCircle2 className="size-4 text-emerald-600" />Recebido no mês</p>
            <p className="font-heading text-2xl font-bold tabular-nums">{formatBRL(recebido)}</p>
            <div className="h-2 overflow-hidden rounded-full bg-secondary" aria-hidden>
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-sm text-muted-foreground">{pct}% de {formatBRL(previsto)} previsto</p>
          </Card>
        </Link>
        <Link href="/admin/financeiro/inadimplentes">
          <Card className={cn("h-full gap-1 p-4 transition-shadow hover:shadow-md", totalAtraso > 0 && "border-red-200 bg-red-50/60")}>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><AlertTriangle className="size-4 text-red-600" />Em atraso</p>
            <p className={cn("font-heading text-xl font-bold whitespace-nowrap tabular-nums sm:text-2xl", totalAtraso > 0 && "text-red-700")}>{formatBRL(totalAtraso)}</p>
            <p className="text-sm text-muted-foreground">{atrasados.length === 0 ? "Ninguém devendo 🎉" : plural(atrasados.length, "aluno", "alunos")}</p>
          </Card>
        </Link>
        <Link href="/admin/financeiro/mes">
          <Card className="h-full gap-1 p-4 transition-shadow hover:shadow-md">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Wallet className="size-4 text-primary" />Resultado do mês</p>
            <p className={cn("font-heading text-xl font-bold whitespace-nowrap tabular-nums sm:text-2xl", resultado < 0 ? "text-red-700" : "text-emerald-700")}>{formatBRL(resultado)}</p>
            <p className="text-sm text-muted-foreground">{formatBRL(despesas)} em despesas</p>
          </Card>
        </Link>
        <Link href="/admin/alunos" className="hidden xl:block">
          <Card className="h-full gap-1 p-4 transition-shadow hover:shadow-md">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Users className="size-4 text-primary" />Alunos ativos</p>
            <p className="font-heading text-2xl font-bold tabular-nums">{alunosAtivos.count ?? 0}</p>
            <p className="text-sm text-muted-foreground">{plural(presentesHoje, "presença hoje", "presenças hoje")}</p>
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
            <ul className="divide-y border-t">
              {[...atrasados, ...vencendo].slice(0, 8).map((g, i) => (
                <li key={g.id} className={cn("px-5 py-3", i >= 4 && "hidden lg:block")}>
                  <div className="flex items-center gap-3">
                    <AvatarIniciais nome={g.nome} tamanho="sm" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/alunos/${g.id}`} className="block truncate font-semibold hover:underline">{g.nome}</Link>
                      <p className={cn("text-sm", g.atrasado ? "font-medium text-red-700" : "text-muted-foreground")}>
                        {g.atrasado
                          ? `${g.itens.length > 1 ? `${g.itens.length} meses · ` : ""}atrasado desde ${formatDiaMes(g.itens[0]!.vencimento)}`
                          : `vence ${g.itens[0]!.vencimento === hoje ? "hoje" : formatDiaMes(g.itens[0]!.vencimento)}`}
                      </p>
                    </div>
                    <span className="font-heading font-bold tabular-nums">{formatBRL(g.total)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 pl-11">
                    <a
                      href={linkCobranca(g.nome, g.telefone, g.itens)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Lembrar ${g.nome} pelo WhatsApp`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-emerald-700")}
                    >
                      <IconeWhatsApp className="size-4" />
                      Lembrar
                    </a>
                    {/* Um botão só: o mês mais antigo. O próximo aparece depois da baixa. */}
                    <BaixaButton
                      pagamentoId={g.itens[0]!.id}
                      aluno={g.nome}
                      competencia={g.itens[0]!.competencia}
                      valor={Number(g.itens[0]!.valor)}
                      rotulo={
                        g.itens.length > 1
                          ? `Recebi ${formatMesAno(g.itens[0]!.competencia).split("/")[0]!.toLowerCase()}`
                          : undefined
                      }
                    />
                  </div>
                </li>
              ))}
            </ul>
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
