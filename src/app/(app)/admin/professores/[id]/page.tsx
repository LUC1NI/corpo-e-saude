import { ChevronLeft, ChevronRight, Clock, Mail, Users } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "@/components/ui-extra/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AvatarIniciais } from "@/components/ui-extra/avatar-iniciais";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { StatusBadge } from "@/components/ui-extra/status-badge";
import { requireUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DIAS_SEMANA, horaCurta } from "@/lib/tipos";

import { ProfessorForm } from "../professor-form";
import { ToggleAtivoProfessor } from "../toggle-ativo";
import { plural } from "@/lib/formato";

const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];

interface ProfessorDetalhe {
  id: string;
  nome: string;
  telefone: string | null;
  especialidade: string | null;
  ativo: boolean;
  usuarios: { email: string } | null;
}

export default async function ProfessorDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUsuario(["admin"]);
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: profData }, { data: alunosData }, { data: horsData }] =
    await Promise.all([
      supabase
        .from("professores")
        .select("id, nome, telefone, especialidade, ativo, usuarios(email)")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("alunos")
        .select("id, nome, tipo, status")
        .eq("professor_id", id)
        .eq("status", "ativo")
        .order("nome"),
      supabase
        .from("horarios")
        .select("id, dia_semana, hora_inicio, hora_fim, capacidade")
        .eq("professor_id", id)
        .order("hora_inicio"),
    ]);

  const professor = profData as unknown as ProfessorDetalhe | null;
  if (!professor) notFound();

  const alunos = (alunosData ?? []) as {
    id: string;
    nome: string;
    tipo: string;
  }[];
  const horarios = (horsData ?? []) as {
    id: string;
    dia_semana: number;
    hora_inicio: string;
    hora_fim: string;
    capacidade: number | null;
  }[];

  // Quantos alunos agendados em cada horário (badge da grade).
  const horIds = horarios.map((h) => h.id);
  const { data: vincData } = horIds.length
    ? await supabase
        .from("aluno_horarios")
        .select("horario_id")
        .in("horario_id", horIds)
    : { data: [] as unknown[] };
  const agendadosPorHorario = new Map<string, number>();
  for (const v of (vincData ?? []) as { horario_id: string }[]) {
    agendadosPorHorario.set(
      v.horario_id,
      (agendadosPorHorario.get(v.horario_id) ?? 0) + 1,
    );
  }

  return (
    <>
      <Link
        href="/admin/professores"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Professores
      </Link>

      <PageHeader
        titulo={professor.nome}
        subtitulo={professor.especialidade || "Professor"}
        acoes={
          <StatusBadge tom={professor.ativo ? "sucesso" : "neutro"}>
            {professor.ativo ? "Ativo" : "Inativo"}
          </StatusBadge>
        }
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {/* Cadastro */}
        <Card>
          <CardHeader>
            <CardTitle>Cadastro</CardTitle>
            <CardDescription className="flex items-center gap-1.5">
              <Mail className="size-3.5" />
              {professor.usuarios?.email ?? "-"}
              <span className="text-muted-foreground/60">
                · login do professor
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ProfessorForm
              id={professor.id}
              nome={professor.nome}
              telefone={professor.telefone}
              especialidade={professor.especialidade}
            />
            <div className="border-t pt-4">
              <ToggleAtivoProfessor
                id={professor.id}
                ativo={professor.ativo}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Carteira de alunos */}
          <Card className="overflow-hidden p-0">
            <CardHeader className="p-5">
              <CardTitle>Carteira de alunos</CardTitle>
              <CardDescription>
                {plural(alunos.length, "aluno ativo", "alunos ativos")} com este professor.
              </CardDescription>
            </CardHeader>
            {alunos.length === 0 ? (
              <PageEmpty
                icone={Users}
                titulo="Nenhum aluno na carteira"
                descricao="Atribua alunos a este professor no cadastro do aluno."
              />
            ) : (
              <ul className="divide-y border-t">
                {alunos.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/admin/alunos/${a.id}`}
                      className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <AvatarIniciais nome={a.nome} tamanho="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {a.nome}
                      </span>
                      <StatusBadge tom={a.tipo === "online" ? "info" : "neutro"}>
                        {a.tipo}
                      </StatusBadge>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground/40" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Grade da semana */}
          <Card className="overflow-hidden p-0">
            <CardHeader className="p-5">
              <CardTitle>Grade da semana</CardTitle>
              <CardDescription>
                Horários deste professor e alunos agendados.
              </CardDescription>
            </CardHeader>
            {horarios.length === 0 ? (
              <PageEmpty
                icone={Clock}
                titulo="Sem horários cadastrados"
                descricao="Monte a grade dele em Horários."
              />
            ) : (
              <ul className="divide-y border-t">
                {ORDEM_DIAS.filter((d) =>
                  horarios.some((h) => h.dia_semana === d),
                ).map((d) => (
                  <li key={d} className="flex items-start gap-3 px-5 py-3">
                    <span className="w-24 shrink-0 pt-0.5 text-sm font-medium">
                      {DIAS_SEMANA[d]}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {horarios
                        .filter((h) => h.dia_semana === d)
                        .map((h) => (
                          <span
                            key={h.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border bg-secondary/40 px-2 py-1 text-xs tabular-nums"
                          >
                            {horaCurta(h.hora_inicio)}–{horaCurta(h.hora_fim)}
                            <span className="text-muted-foreground">
                              · {agendadosPorHorario.get(h.id) ?? 0}
                              {h.capacidade != null ? `/${h.capacidade}` : ""}
                            </span>
                          </span>
                        ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
