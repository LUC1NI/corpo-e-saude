/**
 * Rascunho do modo treino guardado no aparelho: voltar, recarregar ou o
 * celular fechar a aba não apagam as séries marcadas. Um treino por vez.
 */
export const CHAVE_RASCUNHO = "treino-rascunho";
const VALIDADE_MS = 12 * 60 * 60 * 1000;

export interface RascunhoTreino {
  divisaoId: string;
  iniciadoEm: number;
  feitas: Record<string, number>;
  cargasUsadas: Record<string, string>;
}

export function lerRascunho(divisaoId?: string): RascunhoTreino | null {
  try {
    const r = JSON.parse(localStorage.getItem(CHAVE_RASCUNHO) ?? "null") as RascunhoTreino | null;
    if (!r || Date.now() - r.iniciadoEm > VALIDADE_MS) return null;
    return divisaoId && r.divisaoId !== divisaoId ? null : r;
  } catch {
    return null;
  }
}

export function salvarRascunho(r: RascunhoTreino) {
  try {
    localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(r));
  } catch {
    /* modo privado / sem espaço: segue sem rascunho */
  }
}

export function apagarRascunho() {
  try {
    localStorage.removeItem(CHAVE_RASCUNHO);
  } catch {
    /* idem */
  }
}
