import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface ColunaTabela<T> {
  cabecalho: string;
  celula: (item: T) => React.ReactNode;
  alinhar?: "left" | "right";
  /** No mobile, vira o título (negrito) do cartão. */
  principal?: boolean;
  /** No mobile, ocupa a linha inteira sem rótulo (ex.: ações). */
  semRotuloMobile?: boolean;
}

/**
 * Tabela que vira lista de cartões no mobile (evita o scroll horizontal).
 * Desktop (sm+): tabela normal. Mobile: um cartão por linha, com a coluna
 * `principal` como título e as demais em pares rótulo/valor.
 */
export function TabelaResponsiva<T>({
  colunas,
  dados,
  getKey,
  className,
}: {
  colunas: ColunaTabela<T>[];
  dados: T[];
  getKey: (item: T) => string;
  className?: string;
}) {
  const principal = colunas.find((c) => c.principal) ?? colunas[0]!;
  const secundarias = colunas.filter((c) => c !== principal);

  const ultima = colunas.length - 1;

  return (
    <div className={className}>
      {/* Desktop */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {colunas.map((c, i) => (
                <TableHead
                  key={i}
                  className={cn(
                    "h-11 px-4 text-xs font-medium tracking-wide text-muted-foreground uppercase",
                    i === 0 && "pl-5",
                    i === ultima && "pr-5",
                    c.alinhar === "right" && "text-right",
                  )}
                >
                  {c.cabecalho}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.map((item) => (
              <TableRow key={getKey(item)}>
                {colunas.map((c, i) => (
                  <TableCell
                    key={i}
                    className={cn(
                      "px-4 py-3.5",
                      i === 0 && "pl-5",
                      i === ultima && "pr-5",
                      c === principal && "font-medium text-foreground",
                      c.alinhar === "right" && "text-right",
                    )}
                  >
                    {c.celula(item)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile */}
      <ul className="space-y-3 sm:hidden">
        {dados.map((item) => {
          const acoes = secundarias.filter((c) => c.semRotuloMobile);
          const campos = secundarias.filter((c) => !c.semRotuloMobile);
          return (
            <li
              key={getKey(item)}
              className="rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 font-semibold text-foreground">
                  {principal.celula(item)}
                </div>
                {acoes.length ? (
                  <div className="flex shrink-0 items-center gap-1">
                    {acoes.map((c, i) => (
                      <span key={i}>{c.celula(item)}</span>
                    ))}
                  </div>
                ) : null}
              </div>

              {campos.length ? (
                <dl className="mt-3 divide-y divide-border/60 border-t border-border/60">
                  {campos.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between gap-3 py-2"
                    >
                      <dt className="shrink-0 pt-px text-xs text-muted-foreground">
                        {c.cabecalho}
                      </dt>
                      <dd className="min-w-0 text-right text-sm font-medium break-words text-foreground">
                        {c.celula(item)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
