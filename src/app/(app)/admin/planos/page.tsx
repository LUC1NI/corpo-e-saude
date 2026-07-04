import { CreditCard, Plus } from "lucide-react";
import Link from "@/components/ui-extra/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { StatusBadge } from "@/components/ui-extra/status-badge";
import { TabelaResponsiva } from "@/components/ui-extra/tabela-responsiva";
import { requireUsuario } from "@/lib/auth";
import { formatBRL } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";
import { ROTULO_PERIODICIDADE, type Plano } from "@/lib/tipos";
import { cn } from "@/lib/utils";

export default async function PlanosPage() {
  await requireUsuario(["admin"]);
  const supabase = await createClient();
  const { data: planos } = await supabase
    .from("planos")
    .select("*")
    .order("ativo", { ascending: false })
    .order("nome");

  const lista = (planos ?? []) as Plano[];

  return (
    <>
      <PageHeader
        titulo="Planos"
        subtitulo="Catálogo de planos e valores do studio."
        acoes={
          <Link href="/admin/planos/novo" className={cn(buttonVariants())}>
            <Plus className="size-4" />
            Novo plano
          </Link>
        }
      />

      {lista.length === 0 ? (
        <PageEmpty
          icone={CreditCard}
          titulo="Nenhum plano cadastrado"
          descricao="Crie o primeiro plano para começar a matricular alunos."
          acao={
            <Link href="/admin/planos/novo" className={cn(buttonVariants())}>
              <Plus className="size-4" />
              Novo plano
            </Link>
          }
        />
      ) : (
        <Card className="overflow-hidden p-0 sm:p-0">
          <div className="p-3 sm:p-0">
            <TabelaResponsiva
              dados={lista}
              getKey={(p) => p.id}
              colunas={[
                {
                  cabecalho: "Plano",
                  principal: true,
                  celula: (p) => p.nome,
                },
                { cabecalho: "Valor", celula: (p) => formatBRL(p.valor) },
                {
                  cabecalho: "Periodicidade",
                  celula: (p) => ROTULO_PERIODICIDADE[p.periodicidade],
                },
                {
                  cabecalho: "Duração",
                  celula: (p) =>
                    p.duracao_meses ? `${p.duracao_meses} meses` : "—",
                },
                {
                  cabecalho: "Status",
                  celula: (p) => (
                    <StatusBadge tom={p.ativo ? "sucesso" : "neutro"}>
                      {p.ativo ? "Ativo" : "Inativo"}
                    </StatusBadge>
                  ),
                },
                {
                  cabecalho: "Ações",
                  alinhar: "right",
                  semRotuloMobile: true,
                  celula: (p) => (
                    <Link
                      href={`/admin/planos/${p.id}`}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "sm" }),
                      )}
                    >
                      Editar
                    </Link>
                  ),
                },
              ]}
            />
          </div>
        </Card>
      )}
    </>
  );
}
