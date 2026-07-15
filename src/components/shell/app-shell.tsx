import { format, subDays } from "date-fns";

import { AppHeader } from "@/components/shell/app-header";
import { AppSidebar } from "@/components/shell/app-sidebar";
import type { AlertaNotificacao } from "@/components/shell/notificacoes-button";
import type { Papel } from "@/lib/auth";
import { hojeISO } from "@/lib/financeiro";
import { formatBRL, formatData } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";

/**
 * Notificações do ADMIN: mensalidades pendentes/vencidas. Financeiro é
 * assunto exclusivo do dono (CLAUDE.md §6) — nunca chega ao professor.
 */
async function alertasAdmin(): Promise<AlertaNotificacao[]> {
  const supabase = await createClient();
  const hoje = hojeISO();
  const { data } = await supabase
    .from("pagamentos")
    .select("id, aluno_id, vencimento, valor, status, alunos(nome)")
    .in("status", ["pendente", "vencido"])
    .order("vencimento")
    .limit(8);

  const linhas = (data ?? []) as unknown as {
    id: string;
    aluno_id: string;
    vencimento: string;
    valor: number;
    status: "pendente" | "vencido";
    alunos: { nome: string } | null;
  }[];

  return linhas.map((p) => {
    const vencido = p.status === "vencido" || p.vencimento < hoje;
    return {
      id: p.id,
      titulo: p.alunos?.nome ?? "Aluno",
      descricao: `${formatBRL(Number(p.valor))} · vence ${formatData(p.vencimento)}`,
      href: `/admin/alunos/${p.aluno_id}`,
      rotulo: vencido ? "Vencido" : "Pendente",
      tom: vencido ? ("perigo" as const) : ("alerta" as const),
    };
  });
}

/**
 * Notificações do PROFESSOR: retorno dos alunos (treinos concluídos no app
 * nos últimos 7 dias) e alunos online ainda sem ficha. Nada de financeiro.
 * O RLS já escopa as consultas à carteira dele.
 */
async function alertasProfessor(): Promise<AlertaNotificacao[]> {
  const supabase = await createClient();
  const limite = format(subDays(new Date(), 7), "yyyy-MM-dd");

  const [{ data: execData }, { data: onlineData }, { data: fichasData }] =
    await Promise.all([
      supabase
        .from("treino_execucoes")
        .select("id, aluno_id, nome_divisao, finalizado_em, alunos(nome)")
        .gte("finalizado_em", `${limite}T00:00:00`)
        .order("finalizado_em", { ascending: false })
        .limit(6),
      supabase
        .from("alunos")
        .select("id, nome")
        .eq("tipo", "online")
        .eq("status", "ativo"),
      supabase.from("treinos").select("aluno_id").eq("ativo", true),
    ]);

  const comFicha = new Set(
    ((fichasData ?? []) as { aluno_id: string | null }[]).map(
      (t) => t.aluno_id,
    ),
  );
  const semFicha = ((onlineData ?? []) as { id: string; nome: string }[])
    .filter((a) => !comFicha.has(a.id))
    .slice(0, 4)
    .map((a) => ({
      id: `ficha-${a.id}`,
      titulo: a.nome,
      descricao: "Aluno online ainda sem ficha de treino.",
      href: `/professor/alunos/${a.id}#treino`,
      rotulo: "Sem ficha",
      tom: "alerta" as const,
    }));

  const execucoes = (
    (execData ?? []) as unknown as {
      id: string;
      aluno_id: string;
      nome_divisao: string;
      finalizado_em: string;
      alunos: { nome: string } | null;
    }[]
  ).map((e) => ({
    id: e.id,
    titulo: e.alunos?.nome ?? "Aluno",
    descricao: `Concluiu o treino ${e.nome_divisao} · ${formatData(e.finalizado_em.slice(0, 10))}`,
    href: `/professor/alunos/${e.aluno_id}#execucoes`,
    rotulo: "Treino",
    tom: "sucesso" as const,
  }));

  return [...semFicha, ...execucoes];
}

/**
 * Shell de aplicação (admin/professor): sidebar navy fixa no desktop,
 * drawer no mobile, header sticky e área de conteúdo sobre o fundo claro.
 */
export async function AppShell({
  papel,
  nome,
  children,
}: {
  papel: Papel;
  nome: string;
  children: React.ReactNode;
}) {
  // Cada papel tem as SUAS notificações (professor nunca vê financeiro).
  const alertas =
    papel === "admin" ? await alertasAdmin() : await alertasProfessor();
  const mensagemVazia =
    papel === "admin"
      ? "Nenhuma mensalidade pendente no momento."
      : "Nenhuma novidade dos seus alunos por aqui.";

  return (
    <div className="min-h-dvh bg-background">
      <AppSidebar papel={papel} nome={nome} />
      <div className="lg:pl-64">
        <AppHeader
          papel={papel}
          nome={nome}
          alertas={alertas}
          mensagemVazia={mensagemVazia}
        />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
