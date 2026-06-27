import { ChevronRight, Plus, Users } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {alunos.map((a) => (
            <Link key={a.id} href={`/admin/alunos/${a.id}`}>
              <Card className="h-full gap-3 p-4 transition-colors hover:border-primary/40 hover:bg-secondary/30">
                <div className="flex items-center gap-3">
                  <AvatarIniciais nome={a.nome} tamanho="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{a.nome}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      <span className="capitalize">{a.tipo}</span>
                      {a.professores?.nome ? ` · ${a.professores.nome}` : ""}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <StatusBadge tom={a.status === "ativo" ? "sucesso" : "neutro"}>
                    {a.status === "ativo" ? "Ativo" : "Inativo"}
                  </StatusBadge>
                  <StatusBadge tom={a.usuario_id ? "info" : "neutro"}>
                    {a.usuario_id ? "Com acesso" : "Sem acesso"}
                  </StatusBadge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
