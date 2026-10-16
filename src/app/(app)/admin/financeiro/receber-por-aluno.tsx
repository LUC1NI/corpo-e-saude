import { IconeWhatsApp } from "@/components/landing/icone-whatsapp";
import { buttonVariants } from "@/components/ui/button";
import { AvatarIniciais } from "@/components/ui-extra/avatar-iniciais";
import Link from "@/components/ui-extra/link";
import { linkCobranca, type GrupoCobranca } from "@/lib/cobranca";
import { formatBRL, formatDiaMes } from "@/lib/formato";
import { cn } from "@/lib/utils";

import { BaixaButton } from "./baixa-button";
import { ExcluirPagamentoButton } from "./excluir-pagamento-button";

const fmtMesLongo = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" });
/** "2026-10-01" → "outubro". */
const mesPorExtenso = (competencia: string) => fmtMesLongo.format(new Date(`${competencia.slice(0, 10)}T00:00:00Z`));

/**
 * Lista "a receber" com uma linha por aluno: quanto deve, desde quando,
 * [Lembrar no WhatsApp] e [Recebi] do mês mais antigo (o próximo aparece
 * depois da baixa). Usada no painel, no Financeiro e em "Em aberto".
 */
export function ReceberPorAluno({
  grupos,
  hoje,
  className,
  itemClassName,
  permitirExcluir = false,
}: {
  grupos: GrupoCobranca[];
  hoje: string;
  className?: string;
  itemClassName?: (indice: number) => string | undefined;
  /** Mostra a lixeira da cobrança mais antiga (cobrança gerada por engano). */
  permitirExcluir?: boolean;
}) {
  return (
    <ul className={cn("divide-y", className)}>
      {grupos.map((g, i) => {
        const primeira = g.itens[0]!;
        const meses = g.itens.length;
        // Atrasado: o destaque é o que venceu; o que ainda está no prazo vai à parte.
        const valorPrincipal = g.atrasado ? g.totalVencido : g.total;
        const aVencer = g.total - valorPrincipal;
        return (
          <li key={g.id} className={cn("px-5 py-3", itemClassName?.(i))}>
            <div className="flex items-center gap-3">
              <AvatarIniciais nome={g.nome} tamanho="sm" />
              <div className="min-w-0 flex-1">
                <Link href={`/admin/alunos/${g.id}`} className="block truncate font-semibold hover:underline">
                  {g.nome}
                </Link>
                <p className={cn("text-sm", g.atrasado ? "font-medium text-red-700" : "text-muted-foreground")}>
                  {g.atrasado && g.vencidos.length > 1 ? `${g.vencidos.length} meses · ` : !g.atrasado && meses > 1 ? `${meses} meses · ` : ""}
                  {g.atrasado
                    ? `atrasado desde ${formatDiaMes(primeira.vencimento)}`
                    : `vence ${primeira.vencimento === hoje ? "hoje" : formatDiaMes(primeira.vencimento)}`}
                </p>
              </div>
              <span className="text-right leading-tight">
                <span className="block font-heading font-bold tabular-nums">{formatBRL(valorPrincipal)}</span>
                {aVencer > 0 ? (
                  <span className="block text-xs text-muted-foreground tabular-nums">+ {formatBRL(aVencer)} a vencer</span>
                ) : null}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 pl-11">
              <a
                href={linkCobranca(g.nome, g.telefone, g.atrasado ? g.vencidos : g.itens)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Lembrar ${g.nome} pelo WhatsApp`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-emerald-700")}
              >
                <IconeWhatsApp className="size-4" />
                Lembrar
              </a>
              <BaixaButton
                pagamentoId={primeira.id}
                aluno={g.nome}
                competencia={primeira.competencia}
                valor={Number(primeira.valor)}
                rotulo={meses > 1 ? `Recebi ${mesPorExtenso(primeira.competencia)}` : undefined}
              />
              {permitirExcluir ? <ExcluirPagamentoButton pagamentoId={primeira.id} /> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
