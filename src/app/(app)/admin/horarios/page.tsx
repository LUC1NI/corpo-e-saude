import { Clock } from "lucide-react";
import Link from "@/components/ui-extra/link";

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
import { requireUsuario } from "@/lib/auth";
import { hojeISO } from "@/lib/financeiro";
import { createClient } from "@/lib/supabase/server";
import { DIAS_SEMANA, horaCurta } from "@/lib/tipos";
import { cn } from "@/lib/utils";

import { AdicionarHorario } from "./adicionar-horario";
import { AlunosAulaDialog } from "./alunos-aula-dialog";
import { ExcluirHorarioAdmin } from "./excluir-horario-admin";

const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function AdminHorariosPage({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string }>;
}) {
  await requireUsuario(["admin"]);
  const supabase = await createClient();

  const sp = await searchParams;
  const hojeDia = new Date(`${hojeISO()}T00:00:00`).getDay();
  const diaParam = sp.dia != null ? Number(sp.dia) : hojeDia;
  const dia =
    Number.isInteger(diaParam) && diaParam >= 0 && diaParam <= 6
      ? diaParam
      : hojeDia;

  const [{ data: profsData }, { data: horsData }] = await Promise.all([
    supabase
      .from("professores")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("horarios")
      .select("id, hora_inicio, hora_fim, capacidade, professor_id")
      .eq("dia_semana", dia)
      .order("hora_inicio"),
  ]);

  const professores = (profsData ?? []) as { id: string; nome: string }[];
  const horarios = (horsData ?? []) as {
    id: string;
    hora_inicio: string;
    hora_fim: string;
    capacidade: number | null;
    professor_id: string;
  }[];

  // Alunos agendados por horário (com nome, para o detalhe da célula).
  const horIds = horarios.map((h) => h.id);
  const { data: vincData } = horIds.length
    ? await supabase
        .from("aluno_horarios")
        .select("horario_id, alunos(id, nome)")
        .in("horario_id", horIds)
    : { data: [] as unknown[] };
  const alunosPorHorario = new Map<string, { id: string; nome: string }[]>();
  for (const v of (vincData ?? []) as unknown as {
    horario_id: string;
    alunos: { id: string; nome: string } | null;
  }[]) {
    if (!v.alunos) continue;
    const lista = alunosPorHorario.get(v.horario_id) ?? [];
    lista.push(v.alunos);
    alunosPorHorario.set(v.horario_id, lista);
  }

  // Linhas = faixas de horário distintas; colunas = professores.
  const faixasMap = new Map<string, { inicio: string; fim: string }>();
  for (const h of horarios) {
    faixasMap.set(`${h.hora_inicio}|${h.hora_fim}`, {
      inicio: h.hora_inicio,
      fim: h.hora_fim,
    });
  }
  const faixas = [...faixasMap.values()].sort((a, b) =>
    a.inicio.localeCompare(b.inicio),
  );

  const porProfFaixa = new Map<string, (typeof horarios)[number]>();
  for (const h of horarios) {
    porProfFaixa.set(`${h.professor_id}|${h.hora_inicio}|${h.hora_fim}`, h);
  }

  const diaRotulo = DIAS_SEMANA[dia]!;

  return (
    <>
      <PageHeader
        titulo="Grade de horários"
        subtitulo="Ocupação por professor e horário — veja a disponibilidade num relance."
        acoes={
          professores.length > 0 ? (
            <AdicionarHorario
              professores={professores}
              dia={dia}
              diaRotulo={diaRotulo}
            />
          ) : undefined
        }
      />

      {/* Seletor de dia — 7 colunas iguais, com ponto indicando "hoje" */}
      <div className="mb-5 grid grid-cols-7 gap-1.5">
        {DIAS_CURTOS.map((rotulo, n) => (
          <Link
            key={n}
            href={`/admin/horarios?dia=${n}`}
            aria-label={`${DIAS_SEMANA[n]}${n === hojeDia ? " (hoje)" : ""}`}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg border py-2 text-sm font-medium transition-colors",
              n === dia
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted",
            )}
          >
            {rotulo}
            <span
              className={cn(
                "size-1.5 rounded-full",
                n === hojeDia
                  ? n === dia
                    ? "bg-primary-foreground"
                    : "bg-primary"
                  : "bg-transparent",
              )}
            />
          </Link>
        ))}
      </div>

      {professores.length === 0 ? (
        <PageEmpty
          icone={Clock}
          titulo="Nenhum professor ativo"
          descricao="Cadastre professores para montar a grade."
        />
      ) : faixas.length === 0 ? (
        <Card>
          <PageEmpty
            icone={Clock}
            titulo="Nenhum horário neste dia"
            descricao="Use “Adicionar horário” para montar a grade de um professor neste dia."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="sticky left-0 z-10 bg-card pl-5">
                  Horário
                </TableHead>
                {professores.map((p) => (
                  <TableHead key={p.id} className="min-w-32 text-center">
                    {p.nome}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {faixas.map((f) => (
                <TableRow key={`${f.inicio}|${f.fim}`}>
                  <TableCell className="sticky left-0 z-10 bg-card pl-5 font-medium whitespace-nowrap tabular-nums">
                    {horaCurta(f.inicio)}–{horaCurta(f.fim)}
                  </TableCell>
                  {professores.map((p) => {
                    const h = porProfFaixa.get(`${p.id}|${f.inicio}|${f.fim}`);
                    if (!h) {
                      return (
                        <TableCell
                          key={p.id}
                          className="text-center text-muted-foreground/40"
                        >
                          —
                        </TableCell>
                      );
                    }
                    const rotulo = `${horaCurta(f.inicio)}–${horaCurta(f.fim)}`;
                    return (
                      <TableCell key={p.id} className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <AlunosAulaDialog
                            professorNome={p.nome}
                            rotulo={rotulo}
                            capacidade={h.capacidade}
                            alunos={alunosPorHorario.get(h.id) ?? []}
                          />
                          <ExcluirHorarioAdmin id={h.id} rotulo={rotulo} />
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        <span className="font-medium text-emerald-700">Livre</span> = horário
        aberto sem alunos ·{" "}
        <span className="font-medium text-sky-700">N/cap</span> = ocupação
        atual · <span className="font-medium text-amber-700">cheio</span> ao
        atingir a capacidade · <span className="text-muted-foreground/60">—</span>{" "}
        = sem aula nesse horário.
      </p>
    </>
  );
}
