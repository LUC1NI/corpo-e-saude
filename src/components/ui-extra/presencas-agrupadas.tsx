import { ChevronDown } from "lucide-react";
import { subDays } from "date-fns";

import { formatData } from "@/lib/formato";

/**
 * Presenças recentes agrupadas por dia. Cada dia é um bloco recolhível
 * (`<details>` nativo — acessível, sem JS): a pessoa vê o resumo do dia e, se
 * quiser, clica para abrir a lista completa daquele dia.
 */

interface ItemBase {
  id: string;
  data: string;
  hora: string | null;
}

function rotuloDia(data: string, hoje: string, ontem: string): string {
  if (data === hoje) return "Hoje";
  if (data === ontem) return "Ontem";
  return formatData(data);
}

export function PresencasAgrupadas<T extends ItemBase>({
  itens,
  renderPrincipal,
  renderSecundario,
  renderAcoes,
  abrirPrimeiro = true,
  hoje,
}: {
  itens: T[];
  /** Conteúdo principal da linha (ex.: nome do aluno). */
  renderPrincipal: (item: T) => React.ReactNode;
  /** Texto auxiliar (ex.: professor). */
  renderSecundario?: (item: T) => React.ReactNode;
  /** Ações à direita (ex.: editar/remover). */
  renderAcoes?: (item: T) => React.ReactNode;
  abrirPrimeiro?: boolean;
  /** Data de hoje (ISO) para rotular "Hoje"/"Ontem". */
  hoje: string;
}) {
  const ontem = (() => {
    const d = subDays(new Date(`${hoje}T00:00:00`), 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  })();

  // Agrupa mantendo a ordem recebida (já vem do mais recente ao mais antigo).
  const grupos: { data: string; itens: T[] }[] = [];
  for (const item of itens) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.data === item.data) ultimo.itens.push(item);
    else grupos.push({ data: item.data, itens: [item] });
  }

  return (
    <div className="divide-y">
      {grupos.map((g, i) => (
        <details
          key={g.data}
          open={abrirPrimeiro && i === 0}
          className="group/dia"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-3">
              <ChevronDown className="size-4 text-muted-foreground transition-transform group-open/dia:rotate-180" />
              <span className="font-semibold">
                {rotuloDia(g.data, hoje, ontem)}
              </span>
            </div>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {g.itens.length} presença{g.itens.length > 1 ? "s" : ""}
            </span>
          </summary>
          <ul className="divide-y border-t bg-muted/20">
            {g.itens.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 px-5 py-2.5 pl-12"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {renderPrincipal(item)}
                  </p>
                  {renderSecundario ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {renderSecundario(item)}
                    </p>
                  ) : null}
                </div>
                {renderAcoes ? (
                  <div className="flex shrink-0 items-center gap-1">
                    {renderAcoes(item)}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
