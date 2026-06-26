import { CreditCard, Plus } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { StatusBadge } from "@/components/ui-extra/status-badge";
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
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plano</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Periodicidade</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((plano) => (
                <TableRow key={plano.id}>
                  <TableCell className="font-medium">{plano.nome}</TableCell>
                  <TableCell>{formatBRL(plano.valor)}</TableCell>
                  <TableCell>
                    {ROTULO_PERIODICIDADE[plano.periodicidade]}
                  </TableCell>
                  <TableCell>
                    {plano.duracao_meses ? `${plano.duracao_meses} meses` : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge tom={plano.ativo ? "sucesso" : "neutro"}>
                      {plano.ativo ? "Ativo" : "Inativo"}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/planos/${plano.id}`}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "sm" }),
                      )}
                    >
                      Editar
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
