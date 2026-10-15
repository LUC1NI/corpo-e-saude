import { z } from "zod";
import { cpfValido } from "@/lib/cpf";
import { lerDecimalBR } from "@/lib/formato";

/** Transforma string vazia em undefined (campos opcionais de formulário). */
const valorBRL = z.preprocess(
  lerDecimalBR,
  z.coerce
    .number({ message: "Informe um valor." })
    .positive("O valor deve ser maior que zero.")
    .max(100000, "Valor alto demais. Confira os zeros."),
);

const opcional = (schema: z.ZodString) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    schema.optional(),
  );

/** Telefone brasileiro no formato da máscara: (47) 99999-0000 ou (47) 3333-0000. */
export const telefoneSchema = opcional(
  z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, "Telefone inválido. Use o formato (47) 99999-0000."),
);

// ---------------------------------------------------------------------------
// Aluno
// ---------------------------------------------------------------------------
export const alunoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome completo."),
  data_nascimento: opcional(z.string()),
  telefone: telefoneSchema,
  email: opcional(z.string().email("E-mail inválido.")),
  tipo: z.enum(["presencial", "online"]),
  professor_id: opcional(z.string().uuid()),
  status: z.enum(["ativo", "inativo"]).default("ativo"),
});

export type AlunoInput = z.infer<typeof alunoSchema>;

/** Cadastro rápido: aluno + matrícula + horários fixos + acesso, numa tela. */
export const cadastroAlunoSchema = alunoSchema
  .pick({ nome: true, telefone: true, email: true, tipo: true, professor_id: true })
  .extend({
    plano_id: opcional(z.string().uuid("Plano inválido.")),
    data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data de início."),
    horario_ids: z.array(z.string().uuid()).max(14).default([]),
    gerar_acesso: z.boolean().default(false),
  })
  .refine((d) => !d.gerar_acesso || !!d.email, {
    message: "Informe o e-mail para criar o acesso ao app.",
    path: ["email"],
  });

export type CadastroAlunoInput = z.input<typeof cadastroAlunoSchema>;

// ---------------------------------------------------------------------------
// Plano
// ---------------------------------------------------------------------------
export const planoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do plano."),
  descricao: opcional(z.string()),
  valor: valorBRL,
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
  valor: valorBRL,
  data: z.string().min(1, "Informe a data."),
});

export type DespesaInput = z.input<typeof despesaSchema>;

// ---------------------------------------------------------------------------
// Baixa de mensalidade
// ---------------------------------------------------------------------------
export const FORMAS_PAGAMENTO = ["Pix", "Dinheiro", "Cartão", "Transferência"] as const;

export const baixaSchema = z.object({
  pagamentoId: z.string().uuid(),
  forma: z.enum(FORMAS_PAGAMENTO).optional(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
});

export type BaixaInput = z.infer<typeof baixaSchema>;

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
/** Número opcional no padrão brasileiro ("73,5"), com teto contra erro de digitação. */
const numeroOpcional = (max: number, oque: string) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : lerDecimalBR(v)),
    z.coerce
      .number({ message: `${oque}: número inválido.` })
      .positive(`${oque} deve ser maior que zero.`)
      .max(max, `${oque} parece errado. Confira o valor.`)
      .optional(),
  );

/**
 * Normaliza a altura para METROS, tolerando o jeito que as pessoas digitam:
 * - vírgula ou ponto ("1,86" e "1.86" → 1.86);
 * - centímetros sem separador ("186" → 1.86).
 * Regra: valores ≥ 3 são tratados como centímetros (ninguém tem 3 m).
 */
export function normalizarAltura(v: unknown): number | undefined {
  if (v === "" || v === null || v === undefined) return undefined;
  const n = Number(String(v).trim().replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n >= 3 ? n / 100 : n;
}

const alturaOpcional = z.preprocess(
  normalizarAltura,
  z.coerce.number().positive().max(2.5, "Altura parece errada. Confira.").optional(),
);

export const avaliacaoSchema = z.object({
  data: z.string().min(1, "Informe a data."),
  peso: numeroOpcional(400, "Peso"), // kg
  altura: alturaOpcional, // metros (aceita vírgula e centímetros)
  percentual_gordura: numeroOpcional(80, "% de gordura"),
  observacoes: opcional(z.string()),
  // Medidas (cm) — viram um JSON em `medidas`.
  cintura: numeroOpcional(300, "Cintura"),
  quadril: numeroOpcional(300, "Quadril"),
  braco: numeroOpcional(300, "Braço"),
  coxa: numeroOpcional(300, "Coxa"),
  peitoral: numeroOpcional(300, "Peitoral"),
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

// ---------------------------------------------------------------------------
// NFS-e — dados fiscais do aluno (tomador) e configuração fiscal
// ---------------------------------------------------------------------------
/** Texto opcional que vira só dígitos ("123.456.789-09" -> "12345678909"). */
const digitosOpcional = (tamanho: number, msg: string) =>
  z.preprocess(
    (v) => {
      if (typeof v !== "string") return v;
      const d = v.replace(/\D/g, "");
      return d === "" ? undefined : d;
    },
    z.string().length(tamanho, msg).optional(),
  );

export const dadosFiscaisSchema = z.object({
  cpf: digitosOpcional(11, "CPF deve ter 11 dígitos.").refine(
    (v) => v === undefined || cpfValido(v),
    "CPF inválido (confira os dígitos).",
  ),
  cep: digitosOpcional(8, "CEP deve ter 8 dígitos."),
  logradouro: opcional(z.string().trim().max(120)),
  numero: opcional(z.string().trim().max(10, "Número: até 10 caracteres.")),
  complemento: opcional(z.string().trim().max(60)),
  bairro: opcional(z.string().trim().max(60)),
  cidade: opcional(z.string().trim().max(60)),
  uf: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim().toUpperCase() : undefined),
    z.string().regex(/^[A-Z]{2}$/, "UF inválida.").optional(),
  ),
  codigo_municipio: digitosOpcional(7, "Código IBGE inválido."),
});

export type DadosFiscaisInput = z.infer<typeof dadosFiscaisSchema>;

export const configFiscalSchema = z.object({
  ativo: z.boolean(),
  ambiente: z.enum(["homologacao", "producao"]),
  api_nfse: z.enum(["nfse", "nfsen"]),
  regime: z.enum(["mei", "simples_nacional", "outro"]),
  cnpj: digitosOpcional(14, "CNPJ deve ter 14 dígitos."),
  inscricao_municipal: opcional(z.string().trim().max(30)),
  codigo_servico: opcional(
    z.string().trim().regex(/^\d{2}\.\d{2}$/, "Use o formato do item da LC 116, ex.: 06.04."),
  ),
  codigo_tributacao_nacional: opcional(
    z.string().trim().regex(/^\d{6}$/, "Código nacional tem 6 dígitos, ex.: 060401."),
  ),
  aliquota_iss: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(String(v).replace(",", "."))),
    z.number().min(0).max(5, "Alíquota de ISS vai de 0 a 5%.").optional(),
  ),
  natureza_operacao: opcional(
    z.string().trim().regex(/^1(0[1-9]|1[0-2])$/, "Mafra usa natureza de 101 a 112."),
  ),
  descricao_servico_padrao: z.string().trim().min(5, "Descreva o serviço.").max(500),
  emitir_automaticamente_na_baixa: z.boolean(),
});

export type ConfigFiscalInput = z.infer<typeof configFiscalSchema>;

export const cancelarNotaSchema = z.object({
  notaId: z.string().uuid(),
  justificativa: z
    .string()
    .trim()
    .min(15, "A justificativa precisa de pelo menos 15 caracteres.")
    .max(255),
});
