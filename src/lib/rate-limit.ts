/**
 * Rate limiting simples em memória (por instância do servidor).
 *
 * Suficiente para proteger login e reset de senha em um único processo.
 * ATENÇÃO: em ambiente serverless com múltiplas instâncias, trocar por um
 * store durável (ex.: Postgres ou Upstash Redis) antes do go-live — ver
 * passo 10 (acabamento/segurança).
 */
type Registro = { count: number; reset: number };

const baldes = new Map<string, Registro>();

export function rateLimit(
  chave: string,
  max = 5,
  janelaMs = 60_000,
): { ok: boolean; restante: number; retornaEmSeg: number } {
  const agora = Date.now();
  const reg = baldes.get(chave);

  if (!reg || agora > reg.reset) {
    baldes.set(chave, { count: 1, reset: agora + janelaMs });
    return { ok: true, restante: max - 1, retornaEmSeg: 0 };
  }

  if (reg.count >= max) {
    return {
      ok: false,
      restante: 0,
      retornaEmSeg: Math.ceil((reg.reset - agora) / 1000),
    };
  }

  reg.count += 1;
  return { ok: true, restante: max - reg.count, retornaEmSeg: 0 };
}
