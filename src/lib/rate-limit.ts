import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Rate limiting durável (Postgres) para login e reset de senha.
 *
 * Usa a função `rl_hit` (SECURITY DEFINER) para um incremento atômico que
 * sobrevive a múltiplas instâncias serverless. Se a chamada ao banco falhar,
 * cai no limitador em memória (fail-open por instância) para não derrubar o
 * login por uma intermitência — ver `rateLimitMemoria`.
 */
export interface ResultadoRate {
  ok: boolean;
  restante: number;
  retornaEmSeg: number;
}

// --- Fallback em memória (por instância) -----------------------------------
type Registro = { count: number; reset: number };
const baldes = new Map<string, Registro>();

function rateLimitMemoria(
  chave: string,
  max: number,
  janelaMs: number,
): ResultadoRate {
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

// --- Limitador durável ------------------------------------------------------
export async function rateLimit(
  chave: string,
  max = 5,
  janelaMs = 60_000,
): Promise<ResultadoRate> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("rl_hit", {
      p_chave: chave,
      p_max: max,
      p_janela_seg: Math.ceil(janelaMs / 1000),
    });
    const linha = Array.isArray(data) ? data[0] : data;
    if (error || !linha) throw error ?? new Error("rl_hit sem retorno");
    return {
      ok: linha.ok as boolean,
      restante: linha.restante as number,
      retornaEmSeg: linha.retorna_em_seg as number,
    };
  } catch (e) {
    console.error("rate-limit: usando fallback em memória —", e);
    return rateLimitMemoria(chave, max, janelaMs);
  }
}
