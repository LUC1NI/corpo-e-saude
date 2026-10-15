import { ChevronRight, Mail, Phone, UserCog } from "lucide-react";
import Link from "@/components/ui-extra/link";

import { Card, CardContent } from "@/components/ui/card";
import { AvatarIniciais } from "@/components/ui-extra/avatar-iniciais";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { StatusBadge } from "@/components/ui-extra/status-badge";
import { requireUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { AdicionarProfessor } from "./adicionar-professor";
import { ToggleAtivoProfessor } from "./toggle-ativo";
import { plural } from "@/lib/formato";

interface ProfessorLista {
  id: string;
  nome: string;
  telefone: string | null;
  especialidade: string | null;
  ativo: boolean;
  usuarios: { email: string } | null;
}

export default async function ProfessoresPage() {
  await requireUsuario(["admin"]);
  const supabase = await createClient();

  const [{ data: profsData }, { data: alunosData }] = await Promise.all([
    supabase
      .from("professores")
      .select("id, nome, telefone, especialidade, ativo, usuarios(email)")
      .order("ativo", { ascending: false })
      .order("nome"),
    supabase.from("alunos").select("professor_id").eq("status", "ativo"),
  ]);

  const professores = (profsData ?? []) as unknown as ProfessorLista[];
  const contagem = new Map<string, number>();
  for (const a of (alunosData ?? []) as { professor_id: string | null }[]) {
    if (a.professor_id) {
      contagem.set(a.professor_id, (contagem.get(a.professor_id) ?? 0) + 1);
    }
  }

  return (
    <>
      <PageHeader
        titulo="Professores"
        subtitulo="Equipe do studio e acessos."
        acoes={<AdicionarProfessor />}
      />

      {professores.length === 0 ? (
        <PageEmpty
          icone={UserCog}
          titulo="Nenhum professor cadastrado"
          descricao="Adicione o primeiro professor para montar a equipe."
          acao={<AdicionarProfessor />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {professores.map((p) => (
            <Card key={p.id} className="p-0">
              <CardContent className="space-y-3 p-5">
                {/* Área clicável: abre o detalhe (cadastro, carteira, grade). */}
                <Link
                  href={`/admin/professores/${p.id}`}
                  className="group -m-2 block space-y-3 rounded-xl p-2 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start gap-3">
                    <AvatarIniciais nome={p.nome} tamanho="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold group-hover:text-primary">
                        {p.nome}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.especialidade || "Professor"}
                      </p>
                    </div>
                    <StatusBadge tom="info">
                      {plural(contagem.get(p.id) ?? 0, "aluno", "alunos")}
                    </StatusBadge>
                    <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground/40" />
                  </div>

                  <div className="space-y-1 text-sm">
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="size-3.5 shrink-0" />
                      <span className="truncate">
                        {p.usuarios?.email ?? "-"}
                      </span>
                    </p>
                    {p.telefone ? (
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="size-3.5 shrink-0" />
                        {p.telefone}
                      </p>
                    ) : null}
                  </div>
                </Link>

                <div className="border-t pt-3">
                  <ToggleAtivoProfessor id={p.id} ativo={p.ativo} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
