import { Plus, Users } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AvatarIniciais } from "@/components/ui-extra/avatar-iniciais";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { StatusBadge } from "@/components/ui-extra/status-badge";
import { requireUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

interface AlunoLista {
  id: string;
  nome: string;
  tipo: "presencial" | "online";
  status: "ativo" | "inativo";
  usuario_id: string | null;
  professores: { nome: string } | null;
}

export default async function AlunosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireUsuario(["admin"]);
  const { q } = await searchParams;
  const busca = q?.trim() ?? "";

  const supabase = await createClient();
  let query = supabase
    .from("alunos")
    .select("id, nome, tipo, status, usuario_id, professores(nome)")
    .order("nome")
    .limit(100);
  if (busca) query = query.ilike("nome", `%${busca}%`);

  const { data } = await query;
  const alunos = (data ?? []) as unknown as AlunoLista[];

  return (
    <>
      <PageHeader
        titulo="Alunos"
        subtitulo="Cadastro e carteira de alunos do studio."
        acoes={
          <Link href="/admin/alunos/novo" className={cn(buttonVariants())}>
            <Plus className="size-4" />
            Novo aluno
          </Link>
        }
      />

      <form className="mb-4 max-w-sm">
        <Input
          name="q"
          defaultValue={busca}
          placeholder="Buscar por nome…"
          aria-label="Buscar aluno"
        />
      </form>

      {alunos.length === 0 ? (
        <PageEmpty
          icone={Users}
          titulo={busca ? "Nenhum aluno encontrado" : "Nenhum aluno cadastrado"}
          descricao={
            busca
              ? "Tente outro termo de busca."
              : "Cadastre o primeiro aluno para começar."
          }
          acao={
            !busca ? (
              <Link href="/admin/alunos/novo" className={cn(buttonVariants())}>
                <Plus className="size-4" />
                Novo aluno
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Professor</TableHead>
                <TableHead>Acesso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alunos.map((aluno) => (
                <TableRow key={aluno.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <AvatarIniciais nome={aluno.nome} tamanho="sm" />
                      <span className="font-medium">{aluno.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{aluno.tipo}</TableCell>
                  <TableCell>{aluno.professores?.nome ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge tom={aluno.usuario_id ? "info" : "neutro"}>
                      {aluno.usuario_id ? "Com acesso" : "Sem acesso"}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      tom={aluno.status === "ativo" ? "sucesso" : "neutro"}
                    >
                      {aluno.status === "ativo" ? "Ativo" : "Inativo"}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/alunos/${aluno.id}`}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "sm" }),
                      )}
                    >
                      Abrir
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
