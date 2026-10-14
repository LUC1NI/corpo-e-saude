import {
  CalendarCheck,
  Clock,
  CreditCard,
  Dumbbell,
  Home,
  LayoutDashboard,
  LineChart,
  type LucideIcon,
  QrCode,
  UserCog,
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
  { titulo: "Horários", href: "/admin/horarios", icone: Clock },
  { titulo: "Presença", href: "/admin/presenca", icone: CalendarCheck },
  { titulo: "Treinos", href: "/admin/treinos", icone: Dumbbell },
  { titulo: "Financeiro", href: "/admin/financeiro", icone: Wallet },
  { titulo: "Alunos", href: "/admin/alunos", icone: Users },
  { titulo: "Professores", href: "/admin/professores", icone: UserCog },
  { titulo: "Planos", href: "/admin/planos", icone: CreditCard },
  { titulo: "Acesso dos alunos", href: "/admin/acesso-alunos", icone: QrCode },
];

/** Navegação do professor — apenas a própria carteira de alunos. */
export const navProfessor: ItemNav[] = [
  { titulo: "Visão Geral", href: "/professor", icone: LayoutDashboard },
  { titulo: "Meus Alunos", href: "/professor/alunos", icone: Users },
  { titulo: "Presença", href: "/professor/presenca", icone: CalendarCheck },
  { titulo: "Treinos", href: "/professor/treinos", icone: Dumbbell },
  { titulo: "Horários", href: "/professor/horarios", icone: Clock },
];

export type TipoAluno = "presencial" | "online";

/**
 * Navegação do aluno (bottom-nav no celular, sidebar no desktop). Depende do
 * tipo: o presencial usa o app para ver os HORÁRIOS dele; o online, a ficha
 * de TREINO (acompanhamento a distância).
 */
export function navAluno(tipo: TipoAluno): ItemNav[] {
  return [
    { titulo: "Início", href: "/aluno", icone: Home },
    tipo === "online"
      ? { titulo: "Treino", href: "/aluno/treino", icone: Dumbbell }
      : { titulo: "Horários", href: "/aluno/horarios", icone: Clock },
    { titulo: "Evolução", href: "/aluno/evolucao", icone: LineChart },
    { titulo: "Mensalidade", href: "/aluno/mensalidade", icone: Wallet },
  ];
}

export function navPorPapel(
  papel: Papel,
  tipoAluno: TipoAluno = "presencial",
): ItemNav[] {
  switch (papel) {
    case "admin":
      return navAdmin;
    case "professor":
      return navProfessor;
    case "aluno":
      return navAluno(tipoAluno);
  }
}
