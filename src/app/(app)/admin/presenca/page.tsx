import { CalendarCheck } from "lucide-react";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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
import { StatCard } from "@/components/ui-extra/stat-card";
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead>Professor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Horário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentes.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.alunos?.nome ?? "—"}
                  </TableCell>
                  <TableCell>{p.professores?.nome ?? "—"}</TableCell>
                  <TableCell>{formatData(p.data)}</TableCell>
                  <TableCell>{p.hora ? horaCurta(p.hora) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
