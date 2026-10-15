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
  /** Abre um grupo na sidebar (ex.: "Configurações"). */
  secao?: string;
}

/** Navegação do admin (dono), na ordem do uso diário; configuração no fim. */
export const navAdmin: ItemNav[] = [
  { titulo: "Início", href: "/admin", icone: LayoutDashboard },
  { titulo: "Financeiro", href: "/admin/financeiro", icone: Wallet },
  { titulo: "Alunos", href: "/admin/alunos", icone: Users },
  { titulo: "Horários", href: "/admin/horarios", icone: Clock },
  { titulo: "Presença", href: "/admin/presenca", icone: CalendarCheck },
  { titulo: "Modelos de treino", href: "/admin/treinos", icone: Dumbbell },
  { titulo: "Planos", href: "/admin/planos", icone: CreditCard, secao: "Configurações" },
  { titulo: "Professores", href: "/admin/professores", icone: UserCog },
  { titulo: "QR e acesso dos alunos", href: "/admin/acesso-alunos", icone: QrCode },
];

/** Navegação do professor — apenas a própria carteira de alunos. */
export const navProfessor: ItemNav[] = [
  { titulo: "Hoje", href: "/professor", icone: LayoutDashboard },
  { titulo: "Meus alunos", href: "/professor/alunos", icone: Users },
  { titulo: "Presença", href: "/professor/presenca", icone: CalendarCheck },
  { titulo: "Horários", href: "/professor/horarios", icone: Clock },
  { titulo: "Modelos de treino", href: "/professor/treinos", icone: Dumbbell },
];

/** Menu inferior do celular: as 4 telas mais usadas de cada perfil. */
export function navInferior(papel: Papel, tipoAluno: TipoAluno = "presencial"): ItemNav[] {
  if (papel === "aluno") return navAluno(tipoAluno);
  const base = papel === "admin" ? navAdmin : navProfessor;
  return base.slice(0, 4).map((i) =>
    i.titulo === "Meus alunos" ? { ...i, titulo: "Alunos" } : i,
  );
}

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
