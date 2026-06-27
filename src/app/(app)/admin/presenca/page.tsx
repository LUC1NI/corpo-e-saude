import { CalendarCheck } from "lucide-react";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { StatCard } from "@/components/ui-extra/stat-card";
import { TabelaResponsiva } from "@/components/ui-extra/tabela-responsiva";
import { requireUsuario } from "@/lib/auth";
import { hojeISO } from "@/lib/financeiro";
import { formatData } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";
import { horaCurta } from "@/lib/tipos";

interface PresencaLinha {
  id: string;
  data: string;
  hora: string | null;
  alunos: { nome: string } | null;
  professores: { nome: string } | null;
}

export default async function AdminPresencaPage() {
  await requireUsuario(["admin"]);
  const supabase = await createClient();
  const hoje = hojeISO();

  const [{ count: presencasHoje }, { data: recentesData }] = await Promise.all([
    supabase
      .from("presencas")
      .select("id", { count: "exact", head: true })
      .eq("data", hoje),
    supabase
      .from("presencas")
      .select("id, data, hora, alunos(nome), professores(nome)")
      .order("data", { ascending: false })
      .order("criado_em", { ascending: false })
      .limit(50),
  ]);

  const recentes = (recentesData ?? []) as unknown as PresencaLinha[];

  return (
    <>
      <PageHeader
        titulo="Presença"
        subtitulo="Acompanhamento das presenças do studio."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          titulo="Presenças hoje"
          valor={String(presencasHoje ?? 0)}
          icone={CalendarCheck}
          tomIcone="primary"
        />
      </div>

      <Card className="overflow-hidden p-0">
        <CardHeader className="p-5">
          <CardTitle>Presenças recentes</CardTitle>
        </CardHeader>
        {recentes.length === 0 ? (
          <PageEmpty
            icone={CalendarCheck}
            titulo="Nenhuma presença registrada"
            descricao="As presenças marcadas pelos professores aparecem aqui."
          />
        ) : (
          <div className="p-3 sm:p-0">
            <TabelaResponsiva
              dados={recentes}
              getKey={(p) => p.id}
              colunas={[
                {
                  cabecalho: "Aluno",
                  principal: true,
                  celula: (p) => p.alunos?.nome ?? "—",
                },
                {
                  cabecalho: "Professor",
                  celula: (p) => p.professores?.nome ?? "—",
                },
                { cabecalho: "Data", celula: (p) => formatData(p.data) },
                {
                  cabecalho: "Horário",
                  celula: (p) => (p.hora ? horaCurta(p.hora) : "—"),
                },
              ]}
            />
          </div>
        )}
      </Card>
    </>
  );
}
