import { BarChart3, CheckCircle2, LayoutDashboard, Wallet } from "lucide-react";

import { AbasLinks } from "@/components/ui-extra/abas-links";

const ABAS = [
  { href: "/admin/financeiro", rotulo: "Resumo", icone: LayoutDashboard },
  { href: "/admin/financeiro/em-aberto", rotulo: "Em aberto", icone: Wallet },
  { href: "/admin/financeiro/recebimentos", rotulo: "Recebimentos", icone: CheckCircle2 },
  { href: "/admin/financeiro/mes", rotulo: "Mês a mês", icone: BarChart3 },
];

export function NavFinanceiro({ ativa }: { ativa: string }) {
  return <AbasLinks rotulo="Seções do financeiro" itens={ABAS.map((a) => ({ ...a, ativa: a.href === ativa }))} />;
}
