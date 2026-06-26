import { CalendarCheck, Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { requireUsuario } from "@/lib/auth";
import { hojeISO } from "@/lib/financeiro";
import { formatData } from "@/lib/formato";
import { getProfessorAtual } from "@/lib/professor";
import { createClient } from "@/lib/supabase/server";
import { DIAS_SEMANA, horaCurta } from "@/lib/tipos";

import { PresencaControls } from "./presenca-controls";
import { PresencaToggle } from "./presenca-toggle";
import { RemoverPresencaButton } from "./remover-presenca-button";

interface HistoricoItem {
  id: string;
  data: string;
  hora: string | null;
  alunos: { nome: string } | null;
}

export default async function PresencaPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; hora?: string }>;
}) {
  await requireUsuario(["professor"]);
  const professor = await getProfessorAtual();
  if (!professor) {
    return (
      <>
        <PageHeader titulo="Presença" />
        <PageEmpty
          icone={CalendarCheck}
          titulo="Perfil de professor não encontrado"
          descricao="Fale com o administrador do studio."
        />
      </>
    );
  }

  const sp = await searchParams;
  const data = sp.data ?? hojeISO();
  const hora = sp.hora ?? null;
  const diaSemana = new Date(`${data}T00:00:00`).getDay();

  const supabase = await createClient();

  let presencasQuery = supabase
    .from("presencas")
    .select("aluno_id")
    .eq("professor_id", professor.id)
    .eq("data", data);
  presencasQuery = hora
    ? presencasQuery.eq("hora", hora)
    : presencasQuery.is("hora", null);

  const [
    { data: alunosData },
    { data: slotsData },
    { data: presencasData },
    { data: historicoData },
  ] = await Promise.all([
    supabase
      .from("alunos")
      .select("id, nome")
      .eq("professor_id", professor.id)
      .eq("status", "ativo")
      .order("nome"),
    supabase
      .from("horarios")
      .select("hora_inicio, hora_fim")
      .eq("professor_id", professor.id)
      .eq("dia_semana", diaSemana)
      .order("hora_inicio"),
    presencasQuery,
    supabase
      .from("presencas")
      .select("id, data, hora, alunos(nome)")
      .eq("professor_id", professor.id)
      .order("data", { ascending: false })
      .order("criado_em", { ascending: false })
      .limit(20),
  ]);

  const alunos = (alunosData ?? []) as { id: string; nome: string }[];
  const slots = (slotsData ?? []) as {
    hora_inicio: string;
    hora_fim: string;
  }[];
  const presentes = new Set(
    ((presencasData ?? []) as { aluno_id: string }[]).map((p) => p.aluno_id),
  );
  const historico = (historicoData ?? []) as unknown as HistoricoItem[];

  return (
    <>
      <PageHeader
        titulo="Presença"
        subtitulo={`${DIAS_SEMANA[diaSemana]}, ${formatData(data)} · ${presentes.size} presente(s)`}
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Marcar presença</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <PresencaControls data={data} hora={hora} slots={slots} />

          {alunos.length === 0 ? (
            <PageEmpty
              icone={Users}
              titulo="Nenhum aluno na sua carteira"
              descricao="Os alunos atribuídos a você aparecerão aqui para marcar presença."
            />
          ) : (
            <ul className="divide-y rounded-lg border">
              {alunos.map((aluno) => (
                <li
                  key={aluno.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <AvatarIniciais nome={aluno.nome} tamanho="sm" />
                    <span className="text-sm font-medium">{aluno.nome}</span>
                  </div>
                  <PresencaToggle
                    alunoId={aluno.id}
                    data={data}
                    hora={hora}
                    presente={presentes.has(aluno.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden p-0">
        <CardHeader className="p-5">
          <CardTitle>Histórico recente</CardTitle>
        </CardHeader>
        {historico.length === 0 ? (
          <PageEmpty
            icone={CalendarCheck}
            titulo="Nenhuma presença registrada"
            descricao="As presenças marcadas aparecem aqui."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historico.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.alunos?.nome ?? "—"}
                  </TableCell>
                  <TableCell>{formatData(p.data)}</TableCell>
                  <TableCell>{p.hora ? horaCurta(p.hora) : "—"}</TableCell>
                  <TableCell className="text-right">
                    <RemoverPresencaButton id={p.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
