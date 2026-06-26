import { format, parseISO } from "date-fns";
import { LineChart as LineChartIcon } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageEmpty } from "@/components/ui-extra/page-empty";
import { formatData } from "@/lib/formato";
import { MEDIDAS_CAMPOS } from "@/lib/schemas";
import type { AvaliacaoFisica } from "@/lib/tipos";

import { AvaliacaoChart, type PontoAvaliacao } from "./avaliacao-chart";
import { AvaliacaoForm } from "./avaliacao-form";
import { ExcluirAvaliacaoButton } from "./excluir-avaliacao-button";

function resumoMedidas(medidas: Record<string, number> | null): string {
  if (!medidas) return "—";
  const partes = MEDIDAS_CAMPOS.filter((m) => medidas[m.chave] != null).map(
    (m) => `${m.rotulo} ${medidas[m.chave]}`,
  );
  return partes.length ? partes.join(" · ") : "—";
}

export function AvaliacoesSection({
  alunoId,
  avaliacoes,
  somenteLeitura = false,
}: {
  alunoId: string;
  avaliacoes: AvaliacaoFisica[];
  somenteLeitura?: boolean;
}) {
  // Gráfico em ordem cronológica (asc); tabela em ordem decrescente.
  const asc = [...avaliacoes].reverse();
  const pontos: PontoAvaliacao[] = asc.map((a) => ({
    data: format(parseISO(a.data), "dd/MM"),
    peso: a.peso,
    gordura: a.percentual_gordura,
  }));

  return (
    <div className="space-y-6">
      {avaliacoes.length >= 2 ? (
        <AvaliacaoChart dados={pontos} />
      ) : (
        <PageEmpty
          icone={LineChartIcon}
          titulo="Sem dados de evolução"
          descricao="Registre ao menos duas avaliações para ver o gráfico de evolução."
        />
      )}

      {!somenteLeitura ? (
        <div className="rounded-lg border p-4">
          <p className="mb-4 text-sm font-semibold">Nova avaliação</p>
          <AvaliacaoForm alunoId={alunoId} />
        </div>
      ) : null}

      {avaliacoes.length > 0 ? (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Peso</TableHead>
                <TableHead>IMC</TableHead>
                <TableHead>% Gord.</TableHead>
                <TableHead>Medidas</TableHead>
                {!somenteLeitura ? (
                  <TableHead className="text-right">Ação</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {avaliacoes.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{formatData(a.data)}</TableCell>
                  <TableCell>{a.peso != null ? `${a.peso} kg` : "—"}</TableCell>
                  <TableCell>{a.imc != null ? a.imc : "—"}</TableCell>
                  <TableCell>
                    {a.percentual_gordura != null
                      ? `${a.percentual_gordura}%`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {resumoMedidas(a.medidas)}
                  </TableCell>
                  {!somenteLeitura ? (
                    <TableCell className="text-right">
                      <ExcluirAvaliacaoButton id={a.id} alunoId={alunoId} />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
