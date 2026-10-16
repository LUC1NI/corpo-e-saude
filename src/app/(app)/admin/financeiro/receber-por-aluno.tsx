import { IconeWhatsApp } from "@/components/landing/icone-whatsapp";
import { buttonVariants } from "@/components/ui/button";
import { AvatarIniciais } from "@/components/ui-extra/avatar-iniciais";
import Link from "@/components/ui-extra/link";
import { linkCobranca, type GrupoCobranca } from "@/lib/cobranca";
import { formatBRL, formatDiaMes, formatMesExtenso } from "@/lib/formato";
import { cn } from "@/lib/utils";

import { BaixaButton } from "./baixa-button";

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
}: {
  grupos: GrupoCobranca[];
  hoje: string;
  className?: string;
  itemClassName?: (indice: number) => string | undefined;
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
                aria-label={`Cobrar ${g.nome} pelo WhatsApp`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <IconeWhatsApp className="size-4 text-[#25D366]" />
                Cobrar
              </a>
              <BaixaButton
                pagamentoId={primeira.id}
                aluno={g.nome}
                competencia={primeira.competencia}
                valor={Number(primeira.valor)}
                rotulo={`Recebi ${formatBRL(Number(primeira.valor))}${meses > 1 ? ` · ${formatMesExtenso(primeira.competencia).slice(0, 3)}` : ""}`}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
