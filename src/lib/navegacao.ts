import {
  CalendarCheck,
  Clock,
  CreditCard,
  Dumbbell,
  Home,
  LayoutDashboard,
  LineChart,
  type LucideIcon,
  Users,
  Wallet,
} from "lucide-react";

import type { Papel } from "@/lib/auth";

export interface ItemNav {
  titulo: string;
  href: string;
  icone: LucideIcon;
}

/** Navegação lateral do admin (dono) — acesso total. */
export const navAdmin: ItemNav[] = [
  { titulo: "Visão Geral", href: "/admin", icone: LayoutDashboard },
  { titulo: "Alunos", href: "/admin/alunos", icone: Users },
  { titulo: "Planos", href: "/admin/planos", icone: CreditCard },
  { titulo: "Presença", href: "/admin/presenca", icone: CalendarCheck },
  { titulo: "Treinos", href: "/admin/treinos", icone: Dumbbell },
  { titulo: "Financeiro", href: "/admin/financeiro", icone: Wallet },
];

/** Navegação do professor — apenas a própria carteira de alunos. */
export const navProfessor: ItemNav[] = [
  { titulo: "Visão Geral", href: "/professor", icone: LayoutDashboard },
  { titulo: "Meus Alunos", href: "/professor/alunos", icone: Users },
  { titulo: "Presença", href: "/professor/presenca", icone: CalendarCheck },
  { titulo: "Treinos", href: "/professor/treinos", icone: Dumbbell },
  { titulo: "Horários", href: "/professor/horarios", icone: Clock },
];

/** Navegação inferior do aluno (mobile-first / PWA). */
export const navAluno: ItemNav[] = [
  { titulo: "Início", href: "/aluno", icone: Home },
  { titulo: "Treino", href: "/aluno/treino", icone: Dumbbell },
  { titulo: "Evolução", href: "/aluno/evolucao", icone: LineChart },
  { titulo: "Mensalidade", href: "/aluno/mensalidade", icone: Wallet },
];

export function navPorPapel(papel: Papel): ItemNav[] {
  switch (papel) {
    case "admin":
      return navAdmin;
    case "professor":
      return navProfessor;
    case "aluno":
      return navAluno;
  }
}
