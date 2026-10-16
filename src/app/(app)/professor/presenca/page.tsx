import { CalendarCheck, Users } from "lucide-react";

import { AulasDoDia, dataDaUrl } from "@/components/presenca/aulas-do-dia";
import { NavAgenda } from "@/components/presenca/nav-agenda";
import { SeletorData } from "@/components/presenca/seletor-data";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { AvatarIniciais } from "@/components/ui-extra/avatar-iniciais";
import Link from "@/components/ui-extra/link";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { requireUsuario } from "@/lib/auth";
import { hojeISO } from "@/lib/financeiro";
import { formatData } from "@/lib/formato";
import { getProfessorAtual } from "@/lib/professor";
import { createClient } from "@/lib/supabase/server";

import { PresencaToggle } from "./presenca-toggle";

/**
 * Presença do professor: a mesma "chamada do dia" do dono, só com as aulas
 * dele. Presença sem horário (aluno online / avulso) fica atrás de um link.
 */
export default async function PresencaPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; vazios?: string; avulso?: string }>;
}) {
  await requireUsuario(["professor"]);
  const professor = await getProfessorAtual();
  if (!professor) {
    return (
      <>
        <PageHeader titulo="Presença" />
        <PageEmpty icone={CalendarCheck} titulo="Perfil de professor não encontrado" descricao="Fale com o administrador do estúdio." />
      </>
    );
  }

  const sp = await searchParams;
  const data = dataDaUrl(sp.data);

  if (sp.avulso === "1") return <PresencaAvulsa professorId={professor.id} data={data ?? hojeISO()} />;

  return (
    <>
      <PageHeader titulo="Agenda" />
      <NavAgenda papel="professor" ativa="chamada" data={data} />
      <AulasDoDia data={data} mostrarVazios={sp.vazios === "1"} basePath="/professor/presenca" professorId={professor.id} />
      <p className="mt-4 text-sm text-muted-foreground">
        Aluno online ou aula fora da grade?{" "}
        <Link
          href={`/professor/presenca?avulso=1${data ? `&data=${data}` : ""}`}
          className="inline-flex min-h-11 items-center font-medium text-primary hover:underline sm:min-h-0"
        >
          Marcar presença avulsa
        </Link>
      </p>
    </>
  );
}

async function PresencaAvulsa({ professorId, data }: { professorId: string; data: string }) {
  const supabase = await createClient();
  const [{ data: alunosData }, { data: presData }] = await Promise.all([
    supabase.from("alunos").select("id, nome, tipo").eq("professor_id", professorId).eq("status", "ativo").order("nome"),
    supabase.from("presencas").select("aluno_id").eq("professor_id", professorId).eq("data", data).is("hora", null),
  ]);
  const alunos = (alunosData ?? []) as { id: string; nome: string; tipo: string }[];
  const presentes = new Set(((presData ?? []) as { aluno_id: string }[]).map((p) => p.aluno_id));

  return (
    <>
      <PageHeader titulo="Presença avulsa" />
      <Link href={`/professor/presenca?data=${data}`} className="mb-4 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline sm:min-h-0">
        ← Voltar para as aulas do dia
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>{data === hojeISO() ? "Hoje" : formatData(data)} · sem horário</CardTitle>
        </CardHeader>
        <div className="px-6 pb-2">
          <SeletorData data={data} basePath="/professor/presenca" extra="&avulso=1" />
        </div>
        {alunos.length === 0 ? (
          <PageEmpty icone={Users} titulo="Nenhum aluno na sua carteira" descricao="Os alunos atribuídos a você aparecem aqui." />
        ) : (
          <ul className="mx-4 mb-5 divide-y rounded-xl border sm:mx-6">
            {alunos.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                  <AvatarIniciais nome={a.nome} tamanho="sm" />
                  <span className="truncate text-sm font-medium">{a.nome}</span>
                  {a.tipo === "online" ? (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">online</span>
                  ) : null}
                </div>
                <PresencaToggle alunoId={a.id} data={data} hora={null} presente={presentes.has(a.id)} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
