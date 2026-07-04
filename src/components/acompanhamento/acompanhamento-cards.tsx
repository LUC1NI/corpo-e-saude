import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Anamnese, AvaliacaoFisica } from "@/lib/tipos";

import { AnamneseForm } from "./anamnese-form";
import { AvaliacoesSection } from "./avaliacoes-section";

/**
 * Cards de anamnese e avaliação física de um aluno. Reutilizado nas telas
 * de detalhe do aluno (admin e professor). Dados sensíveis (LGPD): o RLS
 * garante o acesso só ao professor responsável, ao aluno e ao admin.
 */
export function AcompanhamentoCards({
  alunoId,
  anamnese,
  avaliacoes,
}: {
  alunoId: string;
  anamnese: Anamnese | null;
  avaliacoes: AvaliacaoFisica[];
}) {
  return (
    <>
      <Card id="anamnese">
        <CardHeader>
          <CardTitle>Anamnese</CardTitle>
          <CardDescription>
            Ficha de saúde do aluno. Informação sensível, de acesso restrito.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnamneseForm
            alunoId={alunoId}
            valoresIniciais={
              anamnese
                ? {
                    historico_saude: anamnese.historico_saude ?? "",
                    lesoes_restricoes: anamnese.lesoes_restricoes ?? "",
                    medicacao: anamnese.medicacao ?? "",
                    objetivos: anamnese.objetivos ?? "",
                    rotina_disponibilidade:
                      anamnese.rotina_disponibilidade ?? "",
                    nivel_atividade: anamnese.nivel_atividade ?? "",
                  }
                : undefined
            }
          />
        </CardContent>
      </Card>

      <Card id="avaliacoes">
        <CardHeader>
          <CardTitle>Avaliação física</CardTitle>
          <CardDescription>
            Histórico de avaliações e evolução (peso, % de gordura, medidas).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AvaliacoesSection alunoId={alunoId} avaliacoes={avaliacoes} />
        </CardContent>
      </Card>
    </>
  );
}
