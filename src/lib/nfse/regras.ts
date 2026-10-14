/**
 * Regras puras da NFS-e (sem imports de app, para rodar no `node --test`):
 * referência idempotente, template da descrição, transições de status,
 * dados obrigatórios do tomador e montagem do payload da Focus NFe.
 */

/** IBGE de Mafra/SC (município do prestador). */
export const IBGE_MAFRA = 4210100;

export type StatusNota =
  | "aguardando_configuracao"
  | "processando"
  | "autorizada"
  | "erro"
  | "cancelada";

export type ApiNfse = "nfse" | "nfsen";
export type Regime = "mei" | "simples_nacional" | "outro";

export interface ConfigFiscal {
  ativo: boolean;
  ambiente: "homologacao" | "producao";
  api_nfse: ApiNfse;
  regime: Regime;
  cnpj: string | null;
  inscricao_municipal: string | null;
  codigo_servico: string | null;
  codigo_tributacao_nacional: string | null;
  aliquota_iss: number | null;
  natureza_operacao: string | null;
  descricao_servico_padrao: string;
  emitir_automaticamente_na_baixa: boolean;
}

export interface DadosTomador {
  nome: string;
  email: string | null;
  cpf: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  codigo_municipio: string | null;
}

// ---------------------------------------------------------------------------
// Referência idempotente
// ---------------------------------------------------------------------------

/**
 * Referência da nota na Focus. A mesma cobrança sempre gera a mesma
 * referência (reenviar nunca duplica nota). Só depois de uma nota CANCELADA a
 * cobrança ganha uma nova referência (a Focus não reaproveita ref cancelada).
 */
export function referenciaNota(pagamentoId: string, canceladasAntes = 0): string {
  return canceladasAntes > 0
    ? `pag-${pagamentoId}-${canceladasAntes + 1}`
    : `pag-${pagamentoId}`;
}

// ---------------------------------------------------------------------------
// Descrição do serviço
// ---------------------------------------------------------------------------

/**
 * Preenche o template da descrição. Placeholders: {plano}, {mes}, {ano},
 * {aluno}. `competencia` é a data yyyy-MM-dd do mês de referência.
 */
export function descricaoServico(
  template: string,
  dados: { plano: string; competencia: string; aluno: string },
): string {
  const [ano, mes] = dados.competencia.split("-");
  return template
    .replaceAll("{plano}", dados.plano)
    .replaceAll("{mes}", mes ?? "")
    .replaceAll("{ano}", ano ?? "")
    .replaceAll("{aluno}", dados.aluno)
    .trim();
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

const TRANSICOES: Record<StatusNota, StatusNota[]> = {
  aguardando_configuracao: ["processando", "autorizada", "erro", "aguardando_configuracao"],
  processando: ["processando", "autorizada", "erro", "cancelada"],
  erro: ["processando", "autorizada", "erro", "aguardando_configuracao"],
  autorizada: ["cancelada"],
  cancelada: [],
};

export function podeTransicionar(de: StatusNota, para: StatusNota): boolean {
  return TRANSICOES[de].includes(para);
}

/** Pode (re)enviar para a API? Só o que ainda não virou nota. */
export function podeEmitir(status: StatusNota): boolean {
  return status === "aguardando_configuracao" || status === "erro";
}

/** Status da Focus -> nosso status. Desconhecido = segue processando. */
export function statusDaFocus(status: string | undefined): StatusNota {
  switch (status) {
    case "autorizado":
      return "autorizada";
    case "cancelado":
      return "cancelada";
    case "erro_autorizacao":
    case "denegado":
      return "erro";
    default:
      return "processando";
  }
}

// ---------------------------------------------------------------------------
// Validação antes de emitir
// ---------------------------------------------------------------------------

export const MSG_FALTA_TOMADOR =
  "Complete CPF e endereço do aluno para emitir a nota.";

/** Campos do tomador que faltam (vazio = pode emitir). */
export function faltandoTomador(t: DadosTomador): string[] {
  const faltam: string[] = [];
  if (!t.cpf || t.cpf.length !== 11) faltam.push("CPF");
  if (!t.cep || t.cep.length !== 8) faltam.push("CEP");
  if (!t.logradouro) faltam.push("logradouro");
  if (!t.numero) faltam.push("número");
  if (!t.bairro) faltam.push("bairro");
  if (!t.uf) faltam.push("UF");
  if (!t.codigo_municipio) faltam.push("município (código IBGE)");
  return faltam;
}

/** Campos da configuração fiscal que faltam para a API aceitar a nota. */
export function faltandoConfig(c: ConfigFiscal): string[] {
  const faltam: string[] = [];
  if (!c.cnpj || c.cnpj.length !== 14) faltam.push("CNPJ");
  if (!c.inscricao_municipal) faltam.push("inscrição municipal");
  if (c.api_nfse === "nfse") {
    if (!c.codigo_servico) faltam.push("código de serviço (LC 116)");
    if (!c.natureza_operacao) faltam.push("natureza da operação");
    if (c.aliquota_iss === null) faltam.push("alíquota de ISS");
  } else if (!c.codigo_tributacao_nacional) {
    faltam.push("código de tributação nacional");
  }
  return faltam;
}

// ---------------------------------------------------------------------------
// Payload da Focus NFe
// ---------------------------------------------------------------------------

export interface DadosNota {
  valor: number;
  competencia: string; // yyyy-MM-dd
  descricao: string;
  /** ISO com fuso de Brasília, ex.: 2026-10-13T10:00:00-03:00 */
  dataEmissao: string;
}

/**
 * Corpo do POST na Focus. `nfse` = NFS-e municipal (Mafra hoje: Publica /
 * ABRASF, natureza 101–112). `nfsen` = NFS-e Nacional (DPS).
 * Conferir em homologação antes de ligar a produção.
 */
export function montarPayloadFocus(
  api: ApiNfse,
  c: ConfigFiscal,
  t: DadosTomador,
  n: DadosNota,
): Record<string, unknown> {
  const valor = Math.round(n.valor * 100) / 100;
  if (api === "nfse") {
    return {
      data_emissao: n.dataEmissao,
      natureza_operacao: c.natureza_operacao,
      optante_simples_nacional: c.regime !== "outro",
      prestador: {
        cnpj: c.cnpj,
        inscricao_municipal: c.inscricao_municipal,
        codigo_municipio: String(IBGE_MAFRA),
      },
      tomador: {
        cpf: t.cpf,
        razao_social: t.nome.slice(0, 115),
        ...(t.email ? { email: t.email } : {}),
        endereco: {
          logradouro: t.logradouro,
          numero: (t.numero ?? "").slice(0, 10),
          ...(t.complemento ? { complemento: t.complemento.slice(0, 60) } : {}),
          bairro: (t.bairro ?? "").slice(0, 60),
          codigo_municipio: t.codigo_municipio,
          uf: t.uf,
          cep: t.cep,
        },
      },
      servico: {
        valor_servicos: valor,
        iss_retido: false,
        item_lista_servico: c.codigo_servico,
        discriminacao: n.descricao,
        aliquota: c.aliquota_iss,
        codigo_municipio: String(IBGE_MAFRA),
      },
    };
  }
  // NFS-e Nacional. opSimpNac: 1 = não optante, 2 = MEI, 3 = ME/EPP.
  // tpRetISSQN: 1 = não retido.
  const opcaoSimples = c.regime === "mei" ? 2 : c.regime === "simples_nacional" ? 3 : 1;
  return {
    data_emissao: n.dataEmissao,
    data_competencia: n.competencia,
    codigo_municipio_emissora: IBGE_MAFRA,
    cnpj_prestador: c.cnpj,
    inscricao_municipal_prestador: c.inscricao_municipal,
    codigo_opcao_simples_nacional: opcaoSimples,
    regime_especial_tributacao: 0,
    cpf_tomador: t.cpf,
    razao_social_tomador: t.nome.slice(0, 115),
    ...(t.email ? { email_tomador: t.email } : {}),
    codigo_municipio_tomador: Number(t.codigo_municipio),
    cep_tomador: t.cep,
    logradouro_tomador: t.logradouro,
    numero_tomador: t.numero,
    ...(t.complemento ? { complemento_tomador: t.complemento } : {}),
    bairro_tomador: t.bairro,
    codigo_municipio_prestacao: IBGE_MAFRA,
    codigo_tributacao_nacional_iss: c.codigo_tributacao_nacional,
    descricao_servico: n.descricao,
    valor_servico: valor,
    tributacao_iss: 1,
    tipo_retencao_iss: 1,
  };
}

// ---------------------------------------------------------------------------
// CSV do contador
// ---------------------------------------------------------------------------

/**
 * Uma linha de CSV (separador ";", padrão do Excel em pt-BR). Aspas sempre,
 * e célula que começa com = + - @ ganha um apóstrofo: impede que um nome
 * malicioso vire fórmula no Excel do contador (CSV injection).
 */
export function linhaCsv(campos: (string | number | null | undefined)[]): string {
  return campos
    .map((c) => {
      let v = c === null || c === undefined ? "" : String(c);
      if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
      return `"${v.replace(/"/g, '""')}"`;
    })
    .join(";");
}
