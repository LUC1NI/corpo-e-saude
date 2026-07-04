import { CalendarCheck, Users } from "lucide-react";
import Link from "@/components/ui-extra/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TabelaResponsiva } from "@/components/ui-extra/tabela-responsiva";
import { AvatarIniciais } from "@/components/ui-extra/avatar-iniciais";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { requireUsuario } from "@/lib/auth";
import { hojeISO } from "@/lib/financeiro";
import { formatData } from "@/lib/formato";
import { getProfessorAtual } from "@/lib/professor";
import { createClient } from "@/lib/supabase/server";
import { DIAS_SEMANA, horaCurta } from "@/lib/tipos";
import { cn } from "@/lib/utils";

import { EditarPresencaButton } from "./editar-presenca-button";
import { PresencaControls } from "./presenca-controls";
import { PresencaToggle } from "./presenca-toggle";
import { RemoverPresencaButton } from "./remover-presenca-button";

interface HistoricoItem {
  id: string;
  aluno_id: string;
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
  const diaSemana = new Date(`${data}T00:00:00`).getDay();

  const supabase = await createClient();

  // Horários do dia primeiro: precisamos deles para escolher o padrão.
  const { data: slotsData } = await supabase
    .from("horarios")
    .select("id, hora_inicio, hora_fim, capacidade")
    .eq("professor_id", professor.id)
    .eq("dia_semana", diaSemana)
    .order("hora_inicio");
  const slots = (slotsData ?? []) as {
    id: string;
    hora_inicio: string;
    hora_fim: string;
    capacidade: number | null;
  }[];

  // Sem parâmetro na URL: já vem com a 1ª aula do dia selecionada (poupa
  // trabalho). "__none__" = o professor escolheu explicitamente "sem horário"
  // (avulso/online). Caso contrário, usa o horário pedido.
  const SEM_HORARIO = "__none__";
  const hora =
    sp.hora === undefined
      ? (slots[0]?.hora_inicio ?? null)
      : sp.hora === SEM_HORARIO
        ? null
        : sp.hora;

  // Aula selecionada (quando há horário). Define quem aparece para marcar:
  //  - com aula: só os alunos atribuídos àquela aula;
  //  - sem horário: todos os alunos ativos da carteira (avulso/online).
  const slotSelecionado = hora
    ? (slots.find((s) => s.hora_inicio === hora) ?? null)
    : null;

  const alunosQuery = slotSelecionado
    ? supabase
        .from("aluno_horarios")
        .select("alunos(id, nome, status)")
        .eq("horario_id", slotSelecionado.id)
    : supabase
        .from("alunos")
        .select("id, nome, status")
        .eq("professor_id", professor.id)
        .eq("status", "ativo")
        .order("nome");

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
    { data: presencasData },
    { data: historicoData },
  ] = await Promise.all([
    alunosQuery,
    presencasQuery,
    supabase
      .from("presencas")
      .select("id, aluno_id, data, hora, alunos(nome)")
      .eq("professor_id", professor.id)
      .order("data", { ascending: false })
      .order("criado_em", { ascending: false })
      .limit(200),
  ]);

  const alunos = slotSelecionado
    ? ((alunosData ?? []) as unknown as {
        alunos: { id: string; nome: string; status: string } | null;
      }[])
        .map((r) => r.alunos)
        .filter(
          (a): a is { id: string; nome: string; status: string } =>
            !!a && a.status === "ativo",
        )
        .map((a) => ({ id: a.id, nome: a.nome }))
        .sort((x, y) => x.nome.localeCompare(y.nome))
    : ((alunosData ?? []) as { id: string; nome: string }[]);
  const presentes = new Set(
    ((presencasData ?? []) as { aluno_id: string }[]).map((p) => p.aluno_id),
  );
  const historico = (historicoData ?? []) as unknown as HistoricoItem[];

  const capacidade = slotSelecionado?.capacidade ?? null;
  const lotada = capacidade != null && presentes.size >= capacidade;

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

          {slotSelecionado ? (
            <div
              className={
                lotada
                  ? "flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
                  : "flex items-center justify-between gap-2 rounded-lg border bg-secondary/40 px-3 py-2 text-sm"
              }
            >
              <span className={lotada ? "font-medium text-amber-800" : ""}>
                {lotada
                  ? "Aula cheia — você ainda pode marcar (encaixe)."
                  : "Presentes nesta aula"}
              </span>
              {/* Presentes em relação aos alunos DA AULA — a capacidade é só
                  informativa (mostrá-la como denominador confundia: "3/5"
                  parecia 2 faltando quando a aula só tem 3 alunos). */}
              <span className="font-semibold">
                {presentes.size}/{alunos.length}
                {capacidade != null ? (
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    · capacidade {capacidade}
                  </span>
                ) : null}
              </span>
            </div>
          ) : null}

          {alunos.length === 0 ? (
            slotSelecionado ? (
              <PageEmpty
                icone={Users}
                titulo="Nenhum aluno nesta aula"
                descricao="Atribua alunos a esta aula em Horários para marcá-los aqui — ou use “Sem horário (avulso/online)”."
                acao={
                  <Link
                    href="/professor/horarios"
                    className={cn(buttonVariants({ variant: "outline" }))}
                  >
                    Ir para Horários
                  </Link>
                }
              />
            ) : (
              <PageEmpty
                icone={Users}
                titulo="Nenhum aluno na sua carteira"
                descricao="Os alunos atribuídos a você aparecerão aqui para marcar presença."
              />
            )
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
        <CardHeader className="flex-row items-center justify-between p-5">
          <CardTitle>Todas as presenças</CardTitle>
          <span className="text-sm text-muted-foreground">
            {historico.length}
            {historico.length === 200 ? "+" : ""} registro(s)
          </span>
        </CardHeader>
        {historico.length === 0 ? (
          <PageEmpty
            icone={CalendarCheck}
            titulo="Nenhuma presença registrada"
            descricao="As presenças marcadas aparecem aqui."
          />
        ) : (
          <div className="p-3 sm:p-0">
            <TabelaResponsiva
              dados={historico}
              getKey={(p) => p.id}
              colunas={[
                {
                  cabecalho: "Aluno",
                  principal: true,
                  celula: (p) => p.alunos?.nome ?? "—",
                },
                { cabecalho: "Data", celula: (p) => formatData(p.data) },
                {
                  cabecalho: "Horário",
                  celula: (p) => (p.hora ? horaCurta(p.hora) : "Sem horário"),
                },
                {
                  cabecalho: "Ações",
                  alinhar: "right",
                  semRotuloMobile: true,
                  celula: (p) => (
                    <div className="flex items-center justify-end gap-1">
                      <EditarPresencaButton
                        id={p.id}
                        nome={p.alunos?.nome ?? "aluno"}
                        data={p.data}
                        hora={p.hora}
                      />
                      <RemoverPresencaButton id={p.id} />
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Card>
    </>
  );
}
