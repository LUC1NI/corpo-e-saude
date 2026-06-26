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
