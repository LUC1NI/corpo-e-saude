import { statusDaFocus, type ApiNfse, type ConfigFiscal, type StatusNota } from "./regras";

/**
 * Camada de provedor de NFS-e: o resto do sistema só conhece a interface, não
 * a Focus. Trocar de emissor = nova implementação de `ProvedorNfse`.
 */

export interface RespostaNfse {
  status: StatusNota;
  numero?: string | null;
  codigo_verificacao?: string | null;
  url_pdf?: string | null;
  url_xml?: string | null;
  mensagem_erro?: string | null;
  /** Data de emissão informada pela prefeitura (ISO). */
  emitida_em?: string | null;
}

export interface ProvedorNfse {
  /** Envia a nota. Mesma referência = mesma nota (idempotente). */
  emitir(referencia: string, dados: Record<string, unknown>): Promise<RespostaNfse>;
  consultar(referencia: string): Promise<RespostaNfse>;
  cancelar(referencia: string, justificativa: string): Promise<RespostaNfse>;
}

// ---------------------------------------------------------------------------
// Focus NFe (https://doc.focusnfe.com.br) — Basic Auth com o token.
// ---------------------------------------------------------------------------
const HOSTS = {
  homologacao: "https://homologacao.focusnfe.com.br",
  producao: "https://api.focusnfe.com.br",
} as const;

interface RespostaFocus {
  status?: string;
  numero?: string | number;
  codigo_verificacao?: string;
  url_danfse?: string;
  url?: string;
  caminho_xml_nota_fiscal?: string;
  data_emissao?: string;
  mensagem?: string;
  codigo?: string;
  erros?: { codigo?: string; mensagem?: string; correcao?: string }[];
}

export class FocusNfeProvider implements ProvedorNfse {
  private readonly host: string;
  private readonly auth: string;

  constructor(
    token: string,
    ambiente: ConfigFiscal["ambiente"],
    private readonly api: ApiNfse,
  ) {
    this.host = HOSTS[ambiente];
    this.auth = `Basic ${btoa(`${token}:`)}`;
  }

  private url(ref: string, extra = ""): string {
    return `${this.host}/v2/${this.api}/${encodeURIComponent(ref)}${extra}`;
  }

  private async chamar(url: string, init: RequestInit): Promise<{ http: number; corpo: RespostaFocus }> {
    const res = await fetch(url, {
      ...init,
      headers: {
        authorization: this.auth,
        "content-type": "application/json",
        ...init.headers,
      },
      signal: AbortSignal.timeout(20_000),
    });
    let corpo: RespostaFocus = {};
    try {
      corpo = (await res.json()) as RespostaFocus;
    } catch {
      /* corpo vazio */
    }
    return { http: res.status, corpo };
  }

  private converter(c: RespostaFocus): RespostaNfse {
    const status = statusDaFocus(c.status);
    const erro =
      c.erros?.map((e) => [e.mensagem, e.correcao].filter(Boolean).join(" ")).join(" | ") ||
      c.mensagem ||
      null;
    return {
      status,
      numero: c.numero != null ? String(c.numero) : null,
      codigo_verificacao: c.codigo_verificacao ?? null,
      url_pdf: c.url_danfse ?? c.url ?? null,
      // O XML vem como caminho relativo ao host da API.
      url_xml: c.caminho_xml_nota_fiscal
        ? new URL(c.caminho_xml_nota_fiscal, this.host).href
        : null,
      mensagem_erro: status === "erro" ? erro : null,
      emitida_em: c.data_emissao ?? null,
    };
  }

  async emitir(referencia: string, dados: Record<string, unknown>): Promise<RespostaNfse> {
    const { http, corpo } = await this.chamar(
      `${this.host}/v2/${this.api}?ref=${encodeURIComponent(referencia)}`,
      { method: "POST", body: JSON.stringify(dados) },
    );
    if (http === 201 || http === 202) return this.converter(corpo);
    // Referência já enviada antes (reenvio): a verdade está na consulta.
    if (http === 422 && /ja|já|existe|processad/i.test(corpo.mensagem ?? "")) {
      return this.consultar(referencia);
    }
    return {
      status: "erro",
      mensagem_erro: `Focus NFe (${http}): ${corpo.mensagem ?? corpo.codigo ?? "erro desconhecido"}`,
    };
  }

  async consultar(referencia: string): Promise<RespostaNfse> {
    const { http, corpo } = await this.chamar(this.url(referencia), { method: "GET" });
    if (http === 200) return this.converter(corpo);
    if (http === 404) {
      return { status: "erro", mensagem_erro: "Nota não encontrada na Focus NFe." };
    }
    throw new Error(`Focus NFe consulta (${http}): ${corpo.mensagem ?? ""}`);
  }

  async cancelar(referencia: string, justificativa: string): Promise<RespostaNfse> {
    // A doc da municipal usa corpo JSON; a da Nacional, query string: manda os dois.
    const { http, corpo } = await this.chamar(
      this.url(referencia, `?justificativa=${encodeURIComponent(justificativa)}`),
      { method: "DELETE", body: JSON.stringify({ justificativa }) },
    );
    if (http === 200 && corpo.status === "cancelado") {
      return { status: "cancelada" };
    }
    const erro =
      corpo.erros?.map((e) => e.mensagem).filter(Boolean).join(" | ") ||
      corpo.mensagem ||
      `HTTP ${http}`;
    // Cancelamento recusado: a nota continua autorizada.
    return { status: "autorizada", mensagem_erro: `Cancelamento recusado: ${erro}` };
  }
}

// ---------------------------------------------------------------------------
// Simulação (só fora de produção): finge a autorização para testar a UI de
// ponta a ponta sem token. Nunca é escolhida num build de produção.
// ---------------------------------------------------------------------------
export class SimulacaoNfseProvider implements ProvedorNfse {
  async emitir(referencia: string): Promise<RespostaNfse> {
    return this.consultar(referencia);
  }
  async consultar(referencia: string): Promise<RespostaNfse> {
    const n = [...referencia].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 99_999, 7);
    return {
      status: "autorizada",
      numero: `SIM-${n}`,
      codigo_verificacao: "SIMULACAO",
      url_pdf: null,
      url_xml: null,
      emitida_em: new Date().toISOString(),
    };
  }
  async cancelar(): Promise<RespostaNfse> {
    return { status: "cancelada" };
  }
}

export type SituacaoEmissao =
  | { tipo: "desativada"; motivo: string }
  | { tipo: "simulacao" }
  | { tipo: "ativa"; ambiente: ConfigFiscal["ambiente"] };

/** Como a emissão está hoje (banner da tela de configuração + decisão). */
export function situacaoEmissao(config: ConfigFiscal | null): SituacaoEmissao {
  const token = process.env.FOCUS_NFE_TOKEN;
  if (!config?.ativo) {
    return { tipo: "desativada", motivo: "Emissão desligada: as notas ficam guardadas e saem todas de uma vez quando você ligar." };
  }
  if (!token) {
    return process.env.NODE_ENV !== "production"
      ? { tipo: "simulacao" }
      : { tipo: "desativada", motivo: "Emissão ainda não ativada pelo suporte: as notas ficam guardadas e saem depois, todas de uma vez." };
  }
  return { tipo: "ativa", ambiente: config.ambiente };
}

/** O provedor a usar, ou null quando a emissão está desativada. */
export function escolherProvedor(config: ConfigFiscal | null): ProvedorNfse | null {
  const s = situacaoEmissao(config);
  if (s.tipo === "simulacao") return new SimulacaoNfseProvider();
  if (s.tipo === "ativa" && config) {
    return new FocusNfeProvider(process.env.FOCUS_NFE_TOKEN!, s.ambiente, config.api_nfse);
  }
  return null;
}
