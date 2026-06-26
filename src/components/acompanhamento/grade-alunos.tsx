import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { AvatarIniciais } from "@/components/ui-extra/avatar-iniciais";

/** Grade de alunos clicáveis, levando ao detalhe (com âncora opcional). */
export function GradeAlunos({
  alunos,
  hrefBase,
  hash = "",
}: {
  alunos: { id: string; nome: string; tipo?: string }[];
  hrefBase: string;
  hash?: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {alunos.map((aluno) => (
        <Link key={aluno.id} href={`${hrefBase}/${aluno.id}${hash}`}>
          <Card className="flex-row items-center gap-3 p-4 transition-colors hover:border-primary/40 hover:bg-secondary/40">
            <AvatarIniciais nome={aluno.nome} tamanho="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{aluno.nome}</p>
              {aluno.tipo ? (
                <p className="text-xs text-muted-foreground capitalize">
                  {aluno.tipo}
                </p>
              ) : null}
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Card>
        </Link>
      ))}
    </div>
  );
}
