import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "@/components/ui-extra/link";

import { cn } from "@/lib/utils";

/**
 * Abas da área financeira. No celular elas QUEBRAM de linha (nada de scroll
 * horizontal escondido): todas as seções ficam sempre visíveis e com alvo de
 * toque confortável.
 */
const ABAS: { href: string; rotulo: string; icone: LucideIcon }[] = [
  { href: "/admin/financeiro", rotulo: "Resumo", icone: LayoutDashboard },
  { href: "/admin/financeiro/mes", rotulo: "Mês", icone: BarChart3 },
  { href: "/admin/financeiro/em-aberto", rotulo: "Em aberto", icone: Wallet },
  {
    href: "/admin/financeiro/inadimplentes",
    rotulo: "Inadimplentes",
    icone: AlertTriangle,
  },
  {
    href: "/admin/financeiro/recebimentos",
    rotulo: "Recebimentos",
    icone: CheckCircle2,
  },
  {
    href: "/admin/financeiro/nota-fiscal",
    rotulo: "Nota fiscal",
    icone: FileText,
  },
];

export type AbaFinanceiro = (typeof ABAS)[number]["href"];

export function NavFinanceiro({ ativa }: { ativa: AbaFinanceiro }) {
  return (
    <nav
      aria-label="Seções do financeiro"
      className="mb-6 flex flex-wrap gap-1.5"
    >
      {ABAS.map((a) => {
        const ehAtiva = a.href === ativa;
        return (
          <Link
            key={a.href}
            href={a.href}
            aria-current={ehAtiva ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm whitespace-nowrap transition-all",
              ehAtiva
                ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                : "border bg-card font-medium text-foreground/80 shadow-sm hover:border-primary/40 hover:text-foreground",
            )}
          >
            <a.icone
              className={cn(
                "size-3.5",
                ehAtiva ? "text-primary-foreground" : "text-primary",
              )}
            />
            {a.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
