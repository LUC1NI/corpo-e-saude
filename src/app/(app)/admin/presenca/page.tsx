import { TrendingUp } from "lucide-react";
import Link from "@/components/ui-extra/link";

import { AulasDoDia, dataDaUrl } from "@/components/presenca/aulas-do-dia";
import { NavAgenda } from "@/components/presenca/nav-agenda";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import { AvatarIniciais } from "@/components/ui-extra/avatar-iniciais";
import { FrequenciaBadge } from "@/components/ui-extra/frequencia";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";
import { requireUsuario } from "@/lib/auth";
import { hojeISO } from "@/lib/financeiro";
import { getFrequenciaAlunos } from "@/lib/frequencia";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPresencaPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; aba?: string; vazios?: string }>;
}) {
  await requireUsuario(["admin"]);
  const sp = await searchParams;
  const frequencia = sp.aba === "frequencia";
  const data = dataDaUrl(sp.data);

  return (
    <>
      <PageHeader titulo="Agenda" />
      <NavAgenda papel="admin" ativa={frequencia ? "frequencia" : "chamada"} data={data} />
      {frequencia ? (
        <Frequencia />
      ) : (
        <AulasDoDia data={data} mostrarVazios={sp.vazios === "1"} basePath="/admin/presenca" />
      )}
    </>
  );
}

async function Frequencia() {
  const supabase = await createClient();
  const hoje = hojeISO();
  const { data } = await supabase.from("alunos").select("id, nome").eq("status", "ativo").order("nome");
  const alunosAtivos = (data ?? []) as { id: string; nome: string }[];
  const freqMap = await getFrequenciaAlunos(supabase, alunosAtivos.map((a) => a.id), hoje);
  // Menor frequência primeiro: é quem precisa de atenção.
  const frequencias = alunosAtivos
    .map((a) => ({ ...a, freq: freqMap.get(a.id) }))
    .filter((a) => a.freq && a.freq.pct !== null)
    .sort((a, b) => (a.freq!.pct ?? 0) - (b.freq!.pct ?? 0));

  return (
    <Card className="overflow-hidden p-0">
      <CardHeader className="p-5">
        <CardTitle>Frequência dos alunos</CardTitle>
        <CardAction>
          <span className="text-xs text-muted-foreground">Últimas 8 semanas · quem falta mais primeiro</span>
        </CardAction>
      </CardHeader>
      {frequencias.length === 0 ? (
        <PageEmpty
          icone={TrendingUp}
          titulo="Ainda sem dados de frequência"
          descricao="A frequência aparece quando os alunos têm horários fixos e presenças marcadas."
        />
      ) : (
        <ul className="divide-y border-t">
          {frequencias.map((a) => (
            <li key={a.id}>
              <Link
                href={`/admin/alunos/${a.id}`}
                className="flex items-center justify-between gap-3 px-5 py-2.5 transition-colors hover:bg-muted/50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <AvatarIniciais nome={a.nome} tamanho="sm" />
                  <span className="truncate text-sm font-medium">{a.nome}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {a.freq!.presente} de {a.freq!.esperado} aulas
                  </span>
                  <FrequenciaBadge pct={a.freq!.pct} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
