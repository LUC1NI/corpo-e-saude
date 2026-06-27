/**
 * Tipos de domínio (linhas das tabelas) usados nas consultas.
 * Espelham o Modelo_de_Dados — mantidos à mão (sem geração automática).
 */

export type TipoAluno = "presencial" | "online";
export type StatusAluno = "ativo" | "inativo";
export type Periodicidade = "mensal" | "trimestral" | "semestral" | "anual";
export type StatusMatricula = "ativa" | "cancelada";
export type StatusPagamento = "pago" | "pendente" | "vencido";

export interface Professor {
  id: string;
  usuario_id: string;
  nome: string;
  telefone: string | null;
  especialidade: string | null;
  ativo: boolean;
  criado_em: string;
}

export interface Aluno {
  id: string;
  usuario_id: string | null;
  professor_id: string | null;
  nome: string;
  data_nascimento: string | null;
  telefone: string | null;
  email: string | null;
  tipo: TipoAluno;
  status: StatusAluno;
  criado_em: string;
}

export interface Plano {
  id: string;
  nome: string;
  descricao: string | null;
  valor: number;
  periodicidade: Periodicidade;
  duracao_meses: number | null;
  ativo: boolean;
  criado_em: string;
}

export interface Matricula {
  id: string;
  aluno_id: string;
  plano_id: string;
  data_inicio: string;
  data_proxima_cobranca: string;
  renovacao_automatica: boolean;
  status: StatusMatricula;
  criado_em: string;
}

export interface Pagamento {
  id: string;
  matricula_id: string;
  aluno_id: string;
  competencia: string;
  valor: number;
  vencimento: string;
  data_pagamento: string | null;
  status: StatusPagamento;
  forma_pagamento: string | null;
  criado_em: string;
}

export interface Anamnese {
  id: string;
  aluno_id: string;
  historico_saude: string | null;
  lesoes_restricoes: string | null;
  medicacao: string | null;
  objetivos: string | null;
  rotina_disponibilidade: string | null;
  nivel_atividade: string | null;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface AvaliacaoFisica {
  id: string;
  aluno_id: string;
  data: string;
  peso: number | null;
  altura: number | null;
  percentual_gordura: number | null;
  imc: number | null;
  medidas: Record<string, number> | null;
  observacoes: string | null;
  criado_por: string | null;
  criado_em: string;
}

export interface Horario {
  id: string;
  professor_id: string;
  dia_semana: number; // 0 = domingo .. 6 = sábado
  hora_inicio: string;
  hora_fim: string;
  capacidade: number | null;
  criado_em: string;
}

export interface Presenca {
  id: string;
  aluno_id: string;
  professor_id: string | null;
  data: string;
  hora: string | null;
  criado_em: string;
}

export const DIAS_SEMANA = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

export const DIAS_SEMANA_CURTO = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
] as const;

/** "HH:MM:SS" -> "HH:MM". */
export function horaCurta(hora: string): string {
  return hora.slice(0, 5);
}

export interface CategoriaDespesa {
  id: string;
  nome: string;
}

export interface Despesa {
  id: string;
  descricao: string;
  categoria_id: string | null;
  valor: number;
  data: string;
  criado_por: string | null;
  criado_em: string;
}

// ---------------------------------------------------------------------------
// Treino
// ---------------------------------------------------------------------------
export interface Exercicio {
  id: string;
  nome: string;
  grupo_muscular: string | null;
  equipamento: string | null;
  descricao: string | null;
  midia_url: string | null;
  criado_em: string;
}

export interface Treino {
  id: string;
  aluno_id: string;
  professor_id: string | null;
  nome: string;
  objetivo: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface TreinoDivisao {
  id: string;
  treino_id: string;
  nome: string; // ex: "A", "B", "C"
  foco: string | null; // ex: "Superior", "Inferior"
  ordem: number;
  dias_semana: number[]; // 0=domingo .. 6=sábado (dias agendados)
}

export interface TreinoExercicio {
  id: string;
  divisao_id: string;
  exercicio_id: string;
  series: number | null;
  repeticoes: string | null;
  carga: string | null;
  descanso: string | null;
  ordem: number;
  observacao: string | null;
}

/** Exercício de uma divisão com o nome do exercício resolvido (join). */
export type TreinoExercicioComNome = TreinoExercicio & {
  exercicio: {
    nome: string;
    grupo_muscular: string | null;
    midia_url: string | null;
  } | null;
};

/** Divisão com seus exercícios já ordenados. */
export type DivisaoComExercicios = TreinoDivisao & {
  exercicios: TreinoExercicioComNome[];
};

/** Ficha de treino completa (divisões + exercícios). */
export type TreinoComTudo = Treino & {
  divisoes: DivisaoComExercicios[];
};

/** Grupos musculares sugeridos na biblioteca de exercícios. */
export const GRUPOS_MUSCULARES = [
  "Peito",
  "Costas",
  "Ombros",
  "Bíceps",
  "Tríceps",
  "Pernas",
  "Glúteos",
  "Abdômen",
  "Panturrilha",
  "Antebraço",
  "Cardio",
  "Corpo inteiro",
] as const;

/** Nº de meses por periodicidade (para calcular a próxima cobrança). */
export const MESES_POR_PERIODICIDADE: Record<Periodicidade, number> = {
  mensal: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

export const ROTULO_PERIODICIDADE: Record<Periodicidade, string> = {
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};
