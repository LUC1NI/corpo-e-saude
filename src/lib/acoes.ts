/** Resultado padrão de uma Server Action de mutação. */
export type ResultadoAcao<T = undefined> =
  | { ok: true; dados?: T }
  | { ok: false; erro: string };

export function sucesso<T>(dados?: T): ResultadoAcao<T> {
  return { ok: true, dados };
}

export function falha(erro: string): ResultadoAcao<never> {
  return { ok: false, erro };
}

/** Mensagem única para quando a chamada nem chega ao servidor. */
export const ERRO_REDE = "Sem conexão com a internet. Confira o sinal e tente de novo.";

/**
 * Chama uma Server Action sem travar a tela se a rede cair: a falha de rede
 * vira um `falha()` comum (o botão para de girar e o aviso aparece).
 */
export async function comRede<T>(acao: Promise<ResultadoAcao<T>>): Promise<ResultadoAcao<T>> {
  try {
    return await acao;
  } catch {
    return { ok: false, erro: ERRO_REDE };
  }
}
