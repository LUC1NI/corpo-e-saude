import { z } from "zod";

/** Transforma string vazia em undefined (campos opcionais de formulário). */
const opcional = (schema: z.ZodString) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    schema.optional(),
  );

// ---------------------------------------------------------------------------
// Aluno
// ---------------------------------------------------------------------------
export const alunoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome completo."),
  data_nascimento: opcional(z.string()),
  telefone: opcional(z.string()),
  email: opcional(z.string().email("E-mail inválido.")),
  tipo: z.enum(["presencial", "online"]),
  professor_id: opcional(z.string().uuid()),
  status: z.enum(["ativo", "inativo"]).default("ativo"),
});

export type AlunoInput = z.infer<typeof alunoSchema>;

// ---------------------------------------------------------------------------
// Plano
// ---------------------------------------------------------------------------
export const planoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do plano."),
  descricao: opcional(z.string()),
  valor: z.coerce
    .number({ message: "Informe um valor." })
    .positive("O valor deve ser maior que zero."),
  periodicidade: z.enum(["mensal", "trimestral", "semestral", "anual"]),
  duracao_meses: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().positive().optional(),
  ),
  ativo: z.boolean().default(true),
});

export type PlanoInput = z.infer<typeof planoSchema>;

// ---------------------------------------------------------------------------
// Matrícula
// ---------------------------------------------------------------------------
export const matriculaSchema = z.object({
  plano_id: z.string().uuid("Selecione um plano."),
  data_inicio: z.string().min(1, "Informe a data de início."),
  renovacao_automatica: z.boolean().default(true),
});

export type MatriculaInput = z.infer<typeof matriculaSchema>;

// ---------------------------------------------------------------------------
// Despesa
// ---------------------------------------------------------------------------
export const despesaSchema = z.object({
  descricao: z.string().trim().min(2, "Informe a descrição."),
  categoria_id: opcional(z.string().uuid()),
  valor: z.coerce
    .number({ message: "Informe um valor." })
    .positive("O valor deve ser maior que zero."),
  data: z.string().min(1, "Informe a data."),
});

export type DespesaInput = z.infer<typeof despesaSchema>;

// ---------------------------------------------------------------------------
// Horário (grade do professor)
// ---------------------------------------------------------------------------
export const horarioSchema = z
  .object({
    dia_semana: z.coerce.number().int().min(0).max(6),
    hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida."),
    hora_fim: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida."),
    capacidade: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : v),
      z.coerce.number().int().positive().optional(),
    ),
  })
  .refine((d) => d.hora_fim > d.hora_inicio, {
    message: "O fim deve ser depois do início.",
    path: ["hora_fim"],
  });

export type HorarioInput = z.infer<typeof horarioSchema>;

// ---------------------------------------------------------------------------
// Anamnese (uma por aluno)
// ---------------------------------------------------------------------------
export const anamneseSchema = z.object({
  historico_saude: opcional(z.string()),
  lesoes_restricoes: opcional(z.string()),
  medicacao: opcional(z.string()),
  objetivos: opcional(z.string()),
  rotina_disponibilidade: opcional(z.string()),
  nivel_atividade: opcional(z.string()),
});

export type AnamneseInput = z.infer<typeof anamneseSchema>;

// ---------------------------------------------------------------------------
// Avaliação física (histórico)
// ---------------------------------------------------------------------------
const numeroOpcional = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.number().positive().optional(),
);

export const avaliacaoSchema = z.object({
  data: z.string().min(1, "Informe a data."),
  peso: numeroOpcional, // kg
  altura: numeroOpcional, // metros
  percentual_gordura: numeroOpcional,
  observacoes: opcional(z.string()),
  // Medidas (cm) — viram um JSON em `medidas`.
  cintura: numeroOpcional,
  quadril: numeroOpcional,
  braco: numeroOpcional,
  coxa: numeroOpcional,
  peitoral: numeroOpcional,
});

export type AvaliacaoInput = z.infer<typeof avaliacaoSchema>;

// ---------------------------------------------------------------------------
// Treino — biblioteca de exercícios
// ---------------------------------------------------------------------------
export const exercicioSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do exercício."),
  grupo_muscular: opcional(z.string()),
  equipamento: opcional(z.string()),
  descricao: opcional(z.string()),
  midia_url: opcional(
    z
      .string()
      .url("URL inválida.")
      // Só http(s): impede link "javascript:" (XSS) salvo como mídia.
      .regex(/^https?:\/\//i, "O link deve começar com http:// ou https://"),
  ),
});

export type ExercicioInput = z.infer<typeof exercicioSchema>;

// ---------------------------------------------------------------------------
// Treino — ficha
// ---------------------------------------------------------------------------
export const treinoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da ficha."),
  objetivo: opcional(z.string()),
  ativo: z.boolean().default(true),
});

export type TreinoInput = z.infer<typeof treinoSchema>;

// ---------------------------------------------------------------------------
// Treino — divisão (A/B/C)
// ---------------------------------------------------------------------------
export const divisaoSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome da divisão."),
  foco: opcional(z.string()),
  dias_semana: z.array(z.number().int().min(0).max(6)).default([]),
});

export type DivisaoInput = z.infer<typeof divisaoSchema>;

// ---------------------------------------------------------------------------
// Treino — exercício dentro de uma divisão (prescrição)
// ---------------------------------------------------------------------------
export const treinoExercicioSchema = z.object({
  exercicio_id: z.string().uuid("Selecione um exercício."),
  series: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().positive().optional(),
  ),
  repeticoes: opcional(z.string()),
  carga: opcional(z.string()),
  descanso: opcional(z.string()),
  observacao: opcional(z.string()),
});

export type TreinoExercicioInput = z.infer<typeof treinoExercicioSchema>;

export const MEDIDAS_CAMPOS = [
  { chave: "cintura", rotulo: "Cintura" },
  { chave: "quadril", rotulo: "Quadril" },
  { chave: "braco", rotulo: "Braço" },
  { chave: "coxa", rotulo: "Coxa" },
  { chave: "peitoral", rotulo: "Peitoral" },
] as const;

// ---------------------------------------------------------------------------
// Treino — execução (modo treino do aluno)
// ---------------------------------------------------------------------------
export const execucaoSchema = z.object({
  divisao_id: z.string().uuid().nullable(),
  nome_divisao: z.string().trim().min(1).max(40),
  foco_divisao: opcional(z.string().max(80)),
  iniciado_em: z.string().datetime({ offset: true }),
  duracao_segundos: z.number().int().min(0).max(86400),
  detalhes: z
    .array(
      z.object({
        nome: z.string().trim().min(1).max(120),
        series: z.number().int().min(0).max(50),
        series_feitas: z.number().int().min(0).max(50),
        carga: opcional(z.string().max(60)),
      }),
    )
    .min(1, "Nenhum exercício no treino.")
    .max(40),
  sensacao: z.enum(["facil", "na_medida", "dificil"]).optional(),
  observacao: opcional(z.string().max(1000)),
});

export type ExecucaoInput = z.infer<typeof execucaoSchema>;
