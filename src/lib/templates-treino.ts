/**
 * Modelos de treino pré-prontos. O professor aplica um modelo a um aluno
 * (gera a ficha + divisões + exercícios já com agenda) e depois ajusta o que
 * quiser. Os exercícios são referenciados por NOME e casados com a biblioteca
 * no momento de aplicar — os que não existirem são ignorados.
 */

export interface TemplateExercicio {
  nome: string;
  series?: number;
  repeticoes?: string;
  descanso?: string;
}

export interface TemplateDivisao {
  nome: string;
  foco: string;
  dias_semana: number[]; // 0=domingo .. 6=sábado
  exercicios: TemplateExercicio[];
}

export interface TemplateTreino {
  id: string;
  nome: string;
  resumo: string;
  objetivo: string;
  divisoes: TemplateDivisao[];
}

export const TEMPLATES_TREINO: TemplateTreino[] = [
  {
    id: "abc",
    nome: "ABC Clássico",
    resumo: "6x/semana · superior, inferior e cardio/core",
    objetivo: "Hipertrofia com divisão ABC — 6 treinos por semana.",
    divisoes: [
      {
        nome: "A",
        foco: "Superior",
        dias_semana: [1, 4],
        exercicios: [
          { nome: "Flexão de braço", series: 3, repeticoes: "12", descanso: "60s" },
          { nome: "Barra fixa", series: 4, repeticoes: "8", descanso: "90s" },
          { nome: "Rosca bíceps", series: 3, repeticoes: "12", descanso: "60s" },
        ],
      },
      {
        nome: "B",
        foco: "Inferior",
        dias_semana: [2, 5],
        exercicios: [
          { nome: "Agachamento livre", series: 4, repeticoes: "10", descanso: "90s" },
          { nome: "Levantamento terra", series: 3, repeticoes: "8", descanso: "120s" },
        ],
      },
      {
        nome: "C",
        foco: "Cardio & Core",
        dias_semana: [3, 6],
        exercicios: [
          { nome: "Burpee", series: 3, repeticoes: "15", descanso: "45s" },
          { nome: "Polichinelo", series: 3, repeticoes: "40", descanso: "30s" },
          { nome: "Abdominal supra", series: 3, repeticoes: "20", descanso: "45s" },
        ],
      },
    ],
  },
  {
    id: "fullbody3x",
    nome: "Full Body 3x",
    resumo: "3x/semana · corpo inteiro (seg, qua, sex)",
    objetivo: "Treino de corpo inteiro 3 vezes por semana.",
    divisoes: [
      {
        nome: "A",
        foco: "Corpo inteiro",
        dias_semana: [1, 3, 5],
        exercicios: [
          { nome: "Agachamento livre", series: 3, repeticoes: "12", descanso: "90s" },
          { nome: "Flexão de braço", series: 3, repeticoes: "12", descanso: "60s" },
          { nome: "Barra fixa", series: 3, repeticoes: "8", descanso: "90s" },
          { nome: "Abdominal supra", series: 3, repeticoes: "20", descanso: "45s" },
        ],
      },
    ],
  },
  {
    id: "iniciante2x",
    nome: "Iniciante 2x",
    resumo: "2x/semana · adaptação (seg e qui)",
    objetivo: "Início de condicionamento — 2 treinos de corpo inteiro.",
    divisoes: [
      {
        nome: "A",
        foco: "Corpo inteiro",
        dias_semana: [1],
        exercicios: [
          { nome: "Agachamento livre", series: 3, repeticoes: "10", descanso: "90s" },
          { nome: "Flexão de braço", series: 3, repeticoes: "10", descanso: "60s" },
          { nome: "Abdominal supra", series: 3, repeticoes: "15", descanso: "45s" },
        ],
      },
      {
        nome: "B",
        foco: "Corpo inteiro",
        dias_semana: [4],
        exercicios: [
          { nome: "Levantamento terra", series: 3, repeticoes: "8", descanso: "120s" },
          { nome: "Barra fixa", series: 3, repeticoes: "6", descanso: "90s" },
          { nome: "Polichinelo", series: 3, repeticoes: "30", descanso: "30s" },
        ],
      },
    ],
  },
];

export function getTemplate(id: string): TemplateTreino | undefined {
  return TEMPLATES_TREINO.find((t) => t.id === id);
}
