import { format } from "date-fns";
import { Clock } from "lucide-react";

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
import { getProfessorAtual } from "@/lib/professor";
import { createClient } from "@/lib/supabase/server";
import { DIAS_SEMANA, horaCurta } from "@/lib/tipos";
import { cn } from "@/lib/utils";

import { AdicionarHorarioProf } from "./adicionar-horario-prof";
import { GerenciarAula } from "./gerenciar-aula";

const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];
const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function HorariosPage() {
  await requireUsuario(["professor"]);
  const professor = await getProfessorAtual();
  if (!professor) {
    return (
      <>
        <PageHeader titulo="Horários" />
        <PageEmpty
          icone={Clock}
          titulo="Perfil de professor não encontrado"
          descricao="Fale com o administrador do studio."
        />
      </>
    );
  }

  const supabase = await createClient();
  const diaHoje = new Date(`${hojeISO()}T00:00:00`).getDay();
  // Hora atual (HH:mm:ss) para esmaecer aulas de hoje que já terminaram.
  const horaAgora = format(new Date(), "HH:mm:ss");

  const [{ data: horsData }, { data: alunosData }] = await Promise.all([
    supabase
      .from("horarios")
      .select("id, dia_semana, hora_inicio, hora_fim, capacidade")
      .eq("professor_id", professor.id)
      .order("hora_inicio"),
    supabase
      .from("alunos")
      .select("id, nome, tipo")
      .eq("professor_id", professor.id)
      .eq("status", "ativo")
      .order("nome"),
  ]);

  const horarios = (horsData ?? []) as {
    id: string;
    dia_semana: number;
    hora_inicio: string;
    hora_fim: string;
    capacidade: number | null;
  }[];
  // Só alunos presenciais entram em aulas do estúdio (online treina pelo app).
  const alunos = (
    (alunosData ?? []) as { id: string; nome: string; tipo: string }[]
  ).filter((a) => a.tipo === "presencial");

  // Alunos atribuídos por horário.
  const horIds = horarios.map((h) => h.id);
  const { data: vincData } = horIds.length
    ? await supabase
        .from("aluno_horarios")
        .select("horario_id, alunos(id, nome)")
        .in("horario_id", horIds)
    : { data: [] as unknown[] };
  const atribuidosPorHorario = new Map<string, { id: string; nome: string }[]>();
  for (const v of (vincData ?? []) as unknown as {
    horario_id: string;
    alunos: { id: string; nome: string } | null;
  }[]) {
    if (!v.alunos) continue;
    const lista = atribuidosPorHorario.get(v.horario_id) ?? [];
    lista.push(v.alunos);
    atribuidosPorHorario.set(v.horario_id, lista);
  }

  // Matriz: linhas = faixas de horário, colunas = dias.
  const faixasMap = new Map<string, { inicio: string; fim: string }>();
  const porDiaFaixa = new Map<string, (typeof horarios)[number]>();
  for (const h of horarios) {
    faixasMap.set(`${h.hora_inicio}|${h.hora_fim}`, {
      inicio: h.hora_inicio,
      fim: h.hora_fim,
    });
    porDiaFaixa.set(`${h.dia_semana}|${h.hora_inicio}|${h.hora_fim}`, h);
  }
  const faixas = [...faixasMap.values()].sort((a, b) =>
    a.inicio.localeCompare(b.inicio),
  );

  return (
    <>
      <PageHeader
        titulo="Horários"
        subtitulo="Sua grade da semana e os alunos de cada aula. Toque numa aula para gerenciar."
        acoes={<AdicionarHorarioProf diaInicial={diaHoje} />}
      />

      {faixas.length === 0 ? (
        <Card>
          <PageEmpty
            icone={Clock}
            titulo="Nenhum horário cadastrado"
            descricao="Use “Adicionar horário” para montar sua grade da semana."
          />
        </Card>
      ) : (
        <>
          {/* Mobile: lista vertical por dia — a matriz de 7 colunas não cabe
              no celular, que é onde o professor mais usa. */}
          <div className="space-y-2.5 sm:hidden">
            {ORDEM_DIAS.map((d) => {
              const doDia = horarios.filter((h) => h.dia_semana === d);
              if (doDia.length === 0) return null;
              const ehHoje = d === diaHoje;
              return (
                <Card
                  key={d}
                  className={cn(
                    "gap-2.5 p-4",
                    ehHoje && "border-primary/40 bg-primary/[0.03]",
                  )}
                >
                  <p className="text-sm font-semibold">
                    {DIAS_SEMANA[d]}
                    {ehHoje ? (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                        hoje
                      </span>
                    ) : null}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {doDia.map((h) => {
                      const turma = atribuidosPorHorario.get(h.id) ?? [];
                      const encerrada = ehHoje && h.hora_fim <= horaAgora;
                      return (
                        <div
                          key={h.id}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5",
                            encerrada && "opacity-55",
                          )}
                        >
                          <span className="text-xs font-medium tabular-nums">
                            {horaCurta(h.hora_inicio)}
                          </span>
                          <GerenciarAula
                            horarioId={h.id}
                            rotulo={`${DIAS_CURTOS[d]} ${horaCurta(h.hora_inicio)}–${horaCurta(h.hora_fim)}`}
                            alunos={alunos}
                            atribuidos={turma.map((a) => a.id)}
                            capacidade={h.capacidade}
                          />
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop: matriz semanal completa. */}
          <Card className="hidden overflow-hidden p-0 sm:block">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="sticky left-0 z-10 bg-card pl-5">
                  Horário
                </TableHead>
                {ORDEM_DIAS.map((d) => (
                  <TableHead
                    key={d}
                    className={cn(
                      "min-w-16 text-center",
                      d === diaHoje && "text-primary",
                    )}
                  >
                    {DIAS_CURTOS[d]}
                    {d === diaHoje ? (
                      <span className="ml-1 text-[10px] opacity-70">hoje</span>
                    ) : null}
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
                  {ORDEM_DIAS.map((d) => {
                    const h = porDiaFaixa.get(`${d}|${f.inicio}|${f.fim}`);
                    if (!h) {
                      return (
                        <TableCell
                          key={d}
                          className={cn(
                            "text-center text-muted-foreground/40",
                            d === diaHoje && "bg-primary/5",
                          )}
                        >
                          -
                        </TableCell>
                      );
                    }
                    const atribuidos = atribuidosPorHorario.get(h.id) ?? [];
                    return (
                      <TableCell
                        key={d}
                        className={cn(
                          "text-center",
                          d === diaHoje && "bg-primary/5",
                          d === diaHoje &&
                            h.hora_fim <= horaAgora &&
                            "opacity-55",
                        )}
                      >
                        <GerenciarAula
                          horarioId={h.id}
                          rotulo={`${DIAS_CURTOS[d]} ${horaCurta(f.inicio)}–${horaCurta(f.fim)}`}
                          alunos={alunos}
                          atribuidos={atribuidos.map((a) => a.id)}
                          capacidade={h.capacidade}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </Card>
        </>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        <span className="font-medium text-emerald-700">Livre</span> = sem alunos
        · <span className="font-medium text-sky-700">N/cap</span> = alunos
        agendados · <span className="font-medium text-amber-700">cheio</span> ao
        atingir a capacidade · toque numa aula para atribuir alunos ou removê-la.
      </p>
    </>
  );
}
