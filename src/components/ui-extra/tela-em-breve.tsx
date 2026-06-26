import { Construction, type LucideIcon } from "lucide-react";

import { PageEmpty } from "@/components/ui-extra/page-empty";
import { PageHeader } from "@/components/ui-extra/page-header";

/** Tela placeholder para módulos ainda não construídos no roadmap. */
export function TelaEmBreve({
  titulo,
  descricao,
  icone = Construction,
}: {
  titulo: string;
  descricao?: string;
  icone?: LucideIcon;
}) {
  return (
    <>
      <PageHeader titulo={titulo} />
      <PageEmpty
        icone={icone}
        titulo="Em construção"
        descricao={
          descricao ?? "Este módulo será construído nos próximos passos."
        }
      />
    </>
  );
}
