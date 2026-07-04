import { AppHeader } from "@/components/shell/app-header";
import { AppSidebar } from "@/components/shell/app-sidebar";
import type { AlertaNotificacao } from "@/components/shell/notificacoes-button";
import type { Papel } from "@/lib/auth";
import { hojeISO } from "@/lib/financeiro";
import { createClient } from "@/lib/supabase/server";

/** Mensalidades pendentes/vencidas, escopadas por papel via RLS. */
async function buscarAlertas(): Promise<AlertaNotificacao[]> {
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

  return linhas.map((p) => ({
    id: p.id,
    aluno_id: p.aluno_id,
    nome: p.alunos?.nome ?? "Aluno",
    vencimento: p.vencimento,
    valor: Number(p.valor),
    status:
      p.status === "pendente" && p.vencimento < hoje ? "vencido" : p.status,
  }));
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
  const alertas = await buscarAlertas();

  return (
    <div className="min-h-dvh bg-background">
      <AppSidebar papel={papel} nome={nome} />
      <div className="lg:pl-64">
        <AppHeader papel={papel} nome={nome} alertas={alertas} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
