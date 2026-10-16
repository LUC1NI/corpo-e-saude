import { CreditCard, Pencil, Plus } from "lucide-react";
import Link from "@/components/ui-extra/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { StatusBadge } from "@/components/ui-extra/status-badge";
import { requireUsuario } from "@/lib/auth";
import { formatBRL } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";
import { ROTULO_PERIODICIDADE, type Plano } from "@/lib/tipos";
import { cn } from "@/lib/utils";

const PARA = { presencial: "Só presencial", online: "Só online" } as const;

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
        // Lista simples (uma linha por plano), igual no celular e no computador.
        <Card className="p-0">
          <ul className="divide-y">
            {lista.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/planos/${p.id}`}
                  className="flex min-h-14 items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {p.nome}
                      {!p.ativo ? <StatusBadge tom="neutro">Inativo</StatusBadge> : null}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {ROTULO_PERIODICIDADE[p.periodicidade]} · {p.tipo_aluno ? PARA[p.tipo_aluno] : "Presencial e online"}
                    </p>
                  </div>
                  <span className="font-heading font-bold tabular-nums">{formatBRL(p.valor)}</span>
                  <Pencil className="size-4 shrink-0 text-primary" aria-label="Editar" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
