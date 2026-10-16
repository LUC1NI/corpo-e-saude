import { CNPJ } from "../components/landing/dados.ts";
import { formatBRL, formatMesAno } from "./formato.ts";

export interface CobrancaAberta {
  id: string;
  aluno_id: string;
  competencia: string;
  vencimento: string;
  valor: number;
  alunos: { nome: string; telefone: string | null } | null;
}

export interface GrupoCobranca {
  id: string;
  nome: string;
  telefone: string | null;
  /** Ordenadas pelo vencimento (a mais antiga primeiro). */
  itens: CobrancaAberta[];
  total: number;
  /** Só os meses já vencidos (é o que se cobra; o resto ainda está no prazo). */
  vencidos: CobrancaAberta[];
  totalVencido: number;
  atrasado: boolean;
}

/**
 * Uma linha por aluno (o dono cobra a pessoa, não o mês). Atrasados primeiro,
 * depois pelo vencimento mais antigo. `abertos` deve vir ordenado por vencimento.
 */
export function agruparPorAluno(abertos: CobrancaAberta[], hoje: string): GrupoCobranca[] {
  const porAluno = new Map<string, GrupoCobranca>();
  for (const p of abertos) {
    const g = porAluno.get(p.aluno_id) ?? {
      id: p.aluno_id,
      nome: p.alunos?.nome ?? "Aluno",
      telefone: p.alunos?.telefone ?? null,
      itens: [],
      total: 0,
      vencidos: [],
      totalVencido: 0,
      atrasado: false,
    };
    g.itens.push(p);
    g.total += Number(p.valor);
    if (p.vencimento < hoje) {
      g.atrasado = true;
      g.vencidos.push(p);
      g.totalVencido += Number(p.valor);
    }
    porAluno.set(p.aluno_id, g);
  }
  return [...porAluno.values()].sort(
    (a, b) => Number(b.atrasado) - Number(a.atrasado) || a.itens[0]!.vencimento.localeCompare(b.itens[0]!.vencimento),
  );
}

/** wa.me com mensagem pronta de cobrança gentil (sem telefone, o WhatsApp pede o contato). */
export function linkCobranca(nome: string, telefone: string | null, itens: { competencia: string; valor: number }[]): string {
  const total = itens.reduce((s, p) => s + Number(p.valor), 0);
  const meses = itens.map((p) => formatMesAno(p.competencia)).join(", ");
  const texto = [
    `Olá, ${nome.split(" ")[0]}! Tudo bem? 😊`,
    `Passando para lembrar da mensalidade de ${meses} (${formatBRL(total)}).`,
    `Pix (CNPJ): ${CNPJ}. Se já pagou, me manda o comprovante e eu dou baixa. Obrigado!`,
  ].join("\n");
  const digitos = (telefone ?? "").replace(/\D/g, "");
  const fone = digitos.length >= 10 ? (digitos.startsWith("55") && digitos.length > 11 ? digitos : `55${digitos}`) : "";
  return `https://wa.me/${fone}?text=${encodeURIComponent(texto)}`;
}
