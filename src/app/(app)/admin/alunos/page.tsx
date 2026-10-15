import { ChevronRight, Plus, Users } from "lucide-react";
import Link from "@/components/ui-extra/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AvatarIniciais } from "@/components/ui-extra/avatar-iniciais";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { StatusBadge } from "@/components/ui-extra/status-badge";
import { requireUsuario } from "@/lib/auth";
import { hojeISO } from "@/lib/financeiro";
import { formatBRL } from "@/lib/formato";
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

const FILTROS = [
  { id: "todos", rotulo: "Todos" },
  { id: "atrasados", rotulo: "Atrasados" },
  { id: "sem-acesso", rotulo: "Sem acesso" },
  { id: "presencial", rotulo: "Presencial" },
  { id: "online", rotulo: "Online" },
  { id: "inativos", rotulo: "Inativos" },
] as const;
type Filtro = (typeof FILTROS)[number]["id"];

export default async function AlunosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; f?: string }>;
}) {
  await requireUsuario(["admin"]);
  const { q, f } = await searchParams;
  const busca = q?.trim() ?? "";
  const filtro: Filtro = FILTROS.some((x) => x.id === f) ? (f as Filtro) : "todos";

  const supabase = await createClient();
  let query = supabase
    .from("alunos")
    .select("id, nome, tipo, status, usuario_id, professores(nome)")
    .order("nome")
    .limit(200);
  query = query.eq("status", filtro === "inativos" ? "inativo" : "ativo");
  if (busca) query = query.ilike("nome", `%${busca}%`);
  if (filtro === "presencial" || filtro === "online") query = query.eq("tipo", filtro);
  if (filtro === "sem-acesso") query = query.is("usuario_id", null);

  const [{ data }, { data: atrasoData }] = await Promise.all([
    query,
    supabase.from("pagamentos").select("aluno_id, valor").neq("status", "pago").lt("vencimento", hojeISO()),
  ]);
  const atraso = new Map<string, number>();
  for (const p of (atrasoData ?? []) as { aluno_id: string; valor: number }[]) {
    atraso.set(p.aluno_id, (atraso.get(p.aluno_id) ?? 0) + Number(p.valor));
  }
  let alunos = (data ?? []) as unknown as AlunoLista[];
  if (filtro === "atrasados") alunos = alunos.filter((a) => atraso.has(a.id));
  const href = (fid: string) => {
    const sp = new URLSearchParams();
    if (busca) sp.set("q", busca);
    if (fid !== "todos") sp.set("f", fid);
    const t = sp.toString();
    return t ? `/admin/alunos?${t}` : "/admin/alunos";
  };

  return (
    <>
      <PageHeader
        titulo="Alunos"
        acoes={
          <Link href="/admin/alunos/novo" className={cn(buttonVariants())}>
            <Plus className="size-4" />
            Novo aluno
          </Link>
        }
      />

      <form className="mb-3 max-w-md">
        {filtro !== "todos" ? <input type="hidden" name="f" value={filtro} /> : null}
        <Input name="q" type="search" defaultValue={busca} placeholder="Buscar por nome" aria-label="Buscar aluno" />
      </form>

      <nav aria-label="Filtros" className="-mx-4 mb-4 overflow-x-auto px-4">
        <ul className="flex min-w-max gap-2">
          {FILTROS.map((x) => (
            <li key={x.id}>
              <Link
                href={href(x.id)}
                aria-current={filtro === x.id ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors sm:h-9",
                  filtro === x.id ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
                )}
              >
                {x.rotulo}
                {x.id === "atrasados" && atraso.size > 0 ? (
                  <span className="ml-1.5 rounded-full bg-red-600 px-1.5 text-xs text-white">{atraso.size}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {alunos.length === 0 ? (
        <PageEmpty
          icone={Users}
          titulo={busca || filtro !== "todos" ? "Ninguém por aqui" : "Nenhum aluno cadastrado"}
          descricao={
            filtro === "atrasados"
              ? "Nenhum aluno com mensalidade atrasada. 🎉"
              : busca || filtro !== "todos"
                ? "Tente outro filtro ou outra busca."
                : "Cadastre o primeiro aluno para começar."
          }
          acao={
            !busca && filtro === "todos" ? (
              <Link href="/admin/alunos/novo" className={cn(buttonVariants())}>
                <Plus className="size-4" />
                Novo aluno
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Card className="gap-0 p-0">
          <ul className="divide-y">
            {alunos.map((a) => {
              const deve = atraso.get(a.id);
              return (
                <li key={a.id}>
                  <Link
                    href={`/admin/alunos/${a.id}`}
                    className="flex min-h-16 items-center gap-3 px-4 py-2 transition-colors hover:bg-secondary/40"
                  >
                    <AvatarIniciais nome={a.nome} tamanho="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{a.nome}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {a.tipo === "online" ? "Online" : "Presencial"}
                        {a.professores?.nome ? ` · ${a.professores.nome.split(" ")[0]}` : ""}
                        {!a.usuario_id ? " · sem acesso ao app" : ""}
                      </p>
                    </div>
                    {deve ? (
                      <StatusBadge tom="perigo"><span className="sr-only sm:not-sr-only">Atrasado · </span>{formatBRL(deve)}</StatusBadge>
                    ) : null}
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
