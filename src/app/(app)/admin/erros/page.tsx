import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { requireUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

interface LogErro {
  id: string;
  origem: string;
  mensagem: string;
  detalhes: Record<string, unknown> | null;
  criado_em: string;
}

const fmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

/**
 * Monitoramento sem custo: os últimos erros registrados pelo próprio app
 * (crons e telas do client). Não substitui um Sentry de verdade, mas dá
 * visibilidade sem depender de conta/plano de terceiro.
 */
export default async function ErrosPage() {
  await requireUsuario(["admin"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("logs_erro")
    .select("id, origem, mensagem, detalhes, criado_em")
    .order("criado_em", { ascending: false })
    .limit(50);

  const erros = (data ?? []) as LogErro[];

  return (
    <>
      <PageHeader
        titulo="Erros recentes"
        subtitulo="Últimos 50 erros do sistema."
      />
      {erros.length === 0 ? (
        <PageEmpty
          icone={CheckCircle2}
          titulo="Nada registrado"
          descricao="Nenhum erro nos últimos registros."
        />
      ) : (
        <ul className="divide-y rounded-2xl border bg-card">
          {erros.map((e) => (
            <li key={e.id} className="flex items-start gap-3 px-5 py-3.5">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {e.mensagem}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {e.origem} · {fmt.format(new Date(e.criado_em))}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
