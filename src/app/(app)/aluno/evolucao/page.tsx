import { LineChart } from "lucide-react";

import { EvolucaoResumo } from "@/components/acompanhamento/evolucao-resumo";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { requireUsuario } from "@/lib/auth";
import { getAlunoAtual } from "@/lib/aluno";
import { createClient } from "@/lib/supabase/server";
import type { AvaliacaoFisica } from "@/lib/tipos";

export default async function AlunoEvolucaoPage() {
  await requireUsuario(["aluno"]);

  const aluno = await getAlunoAtual();
  let avaliacoes: AvaliacaoFisica[] = [];
  if (aluno) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("avaliacoes_fisicas")
      .select("*")
      .eq("aluno_id", aluno.id)
      .order("data", { ascending: false });
    avaliacoes = (data ?? []) as AvaliacaoFisica[];
  }

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-xl font-bold">Sua evolução</h1>

      {avaliacoes.length === 0 ? (
        <PageEmpty
          icone={LineChart}
          titulo="Sem avaliações ainda"
          descricao="Quando seu professor registrar avaliações físicas, seus gráficos e medidas aparecem aqui."
        />
      ) : (
        <EvolucaoResumo avaliacoes={avaliacoes} />
      )}
    </div>
  );
}
