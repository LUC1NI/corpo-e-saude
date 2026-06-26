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
