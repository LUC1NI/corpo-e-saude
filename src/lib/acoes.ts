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
