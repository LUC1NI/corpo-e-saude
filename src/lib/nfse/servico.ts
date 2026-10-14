import type { SupabaseClient } from "@supabase/supabase-js";
import { format } from "date-fns";

import { agoraNoEstudio } from "@/lib/financeiro";

import { escolherProvedor, situacaoEmissao, type RespostaNfse } from "./provedor";
import {
  descricaoServico,
  faltandoConfig,
  faltandoTomador,
  montarPayloadFocus,
  MSG_FALTA_TOMADOR,
  podeEmitir,
  podeTransicionar,
  referenciaNota,
  IBGE_MAFRA,
  type ConfigFiscal,
  type DadosTomador,
  type StatusNota,
} from "./regras";

/**
 * Orquestra a NFS-e no servidor. Recebe o client do Supabase: o do admin
 * logado (RLS de admin) nas ações, ou o service_role no cron/webhook.
 * Nenhuma função aqui lança para fora: erro vira `mensagem_erro` na nota.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type DB = SupabaseClient<any, any, any>;

export interface ResultadoNota {
  status: StatusNota | null;
  mensagem: string;
}

export async function carregarConfigFiscal(db: DB): Promise<ConfigFiscal | null> {
  const { data } = await db.from("config_fiscal").select("*").eq("id", 1).maybeSingle();
  if (!data) return null;
  return {
    ...(data as ConfigFiscal),
    aliquota_iss: data.aliquota_iss === null ? null : Number(data.aliquota_iss),
  };
}

function agoraIsoBrasilia(): string {
  return `${format(agoraNoEstudio(), "yyyy-MM-dd'T'HH:mm:ss")}-03:00`;
}

/** Campos da resposta do provedor -> colunas da nota. */
function camposResposta(r: RespostaNfse) {
  return {
    status: r.status,
    numero: r.numero ?? null,
    codigo_verificacao: r.codigo_verificacao ?? null,
    url_pdf: r.url_pdf ?? null,
    url_xml: r.url_xml ?? null,
    mensagem_erro: r.mensagem_erro ?? null,
    emitida_em:
      r.status === "autorizada" ? (r.emitida_em ?? new Date().toISOString()) : null,
    atualizado_em: new Date().toISOString(),
  };
}

const MENSAGEM_STATUS: Record<StatusNota, string> = {
  aguardando_configuracao:
    "Nota registrada. Ela será emitida quando a API da nota fiscal for ligada.",
  processando: "Nota enviada para a prefeitura. Autorização em andamento.",
  autorizada: "Nota fiscal autorizada.",
  erro: "A nota não foi emitida.",
  cancelada: "Nota cancelada.",
};

/**
 * Emite (ou registra para emitir depois) a nota de um pagamento PAGO.
 * Idempotente: chamar de novo não cria nota duplicada.
 */
export async function emitirNotaDoPagamento(
  db: DB,
  pagamentoId: string,
): Promise<ResultadoNota> {
  try {
    const config = await carregarConfigFiscal(db);

    const { data: pag } = await db
      .from("pagamentos")
      .select("id, aluno_id, valor, competencia, status, matriculas(planos(nome)), alunos(nome, email)")
      .eq("id", pagamentoId)
      .maybeSingle();
    const pagamento = pag as unknown as {
      id: string;
      aluno_id: string;
      valor: number;
      competencia: string;
      status: string;
      matriculas: { planos: { nome: string } | null } | null;
      alunos: { nome: string; email: string | null } | null;
    } | null;
    if (!pagamento) return { status: null, mensagem: "Pagamento não encontrado." };
    if (pagamento.status !== "pago") {
      return { status: null, mensagem: "Só é possível emitir nota de mensalidade paga." };
    }

    const { data: notasData } = await db
      .from("notas_fiscais")
      .select("id, referencia, status")
      .eq("pagamento_id", pagamentoId);
    const notas = (notasData ?? []) as { id: string; referencia: string; status: StatusNota }[];
    const ativa = notas.find((n) => n.status !== "cancelada") ?? null;
    if (ativa && !podeEmitir(ativa.status)) {
      return { status: ativa.status, mensagem: MENSAGEM_STATUS[ativa.status] };
    }
    const referencia =
      ativa?.referencia ??
      referenciaNota(pagamentoId, notas.filter((n) => n.status === "cancelada").length);

    async function gravar(campos: Record<string, unknown>): Promise<ResultadoNota> {
      const status = campos.status as StatusNota;
      const { error } = ativa
        ? await db.from("notas_fiscais").update(campos).eq("id", ativa.id)
        : await db.from("notas_fiscais").insert({
            pagamento_id: pagamentoId,
            aluno_id: pagamento!.aluno_id,
            referencia,
            valor: pagamento!.valor,
            ...campos,
          });
      if (error?.code === "23505") {
        return { status: null, mensagem: "Esta nota já está sendo emitida." };
      }
      if (error) return { status: null, mensagem: "Não foi possível registrar a nota." };
      const extra = status === "erro" && campos.mensagem_erro ? ` ${campos.mensagem_erro}` : "";
      return { status, mensagem: MENSAGEM_STATUS[status] + extra };
    }

    const provedor = escolherProvedor(config);
    if (!provedor || !config) {
      const s = situacaoEmissao(config);
      return gravar({
        status: "aguardando_configuracao",
        mensagem_erro: s.tipo === "desativada" ? s.motivo : null,
        atualizado_em: new Date().toISOString(),
      });
    }

    if (situacaoEmissao(config).tipo === "ativa") {
      const faltaConfig = faltandoConfig(config);
      if (faltaConfig.length) {
        return gravar({
          status: "erro",
          mensagem_erro: `Configuração fiscal incompleta: ${faltaConfig.join(", ")}.`,
          atualizado_em: new Date().toISOString(),
        });
      }
    }

    const { data: fiscal } = await db
      .from("alunos_dados_fiscais")
      .select("*")
      .eq("aluno_id", pagamento.aluno_id)
      .maybeSingle();
    const tomador: DadosTomador = {
      nome: pagamento.alunos?.nome ?? "",
      email: pagamento.alunos?.email ?? null,
      cpf: fiscal?.cpf ?? null,
      cep: fiscal?.cep ?? null,
      logradouro: fiscal?.logradouro ?? null,
      numero: fiscal?.numero ?? null,
      complemento: fiscal?.complemento ?? null,
      bairro: fiscal?.bairro ?? null,
      cidade: fiscal?.cidade ?? null,
      uf: fiscal?.uf ?? null,
      // CEP genérico (89300-000) não traz o IBGE pelo ViaCEP: se a cidade é
      // Mafra/SC (a maioria dos alunos), o código é conhecido.
      codigo_municipio:
        fiscal?.codigo_municipio ??
        (fiscal?.uf === "SC" &&
        fiscal?.cidade?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() === "mafra"
          ? String(IBGE_MAFRA)
          : null),
    };
    if (faltandoTomador(tomador).length) {
      return gravar({
        status: "erro",
        mensagem_erro: MSG_FALTA_TOMADOR,
        atualizado_em: new Date().toISOString(),
      });
    }

    const payload = montarPayloadFocus(config.api_nfse, config, tomador, {
      valor: Number(pagamento.valor),
      competencia: pagamento.competencia,
      descricao: descricaoServico(config.descricao_servico_padrao, {
        plano: pagamento.matriculas?.planos?.nome ?? "Personal Trainer",
        competencia: pagamento.competencia,
        aluno: tomador.nome,
      }),
      dataEmissao: agoraIsoBrasilia(),
    });

    let resposta: RespostaNfse;
    try {
      resposta = await provedor.emitir(referencia, payload);
    } catch (e) {
      resposta = {
        status: "erro",
        mensagem_erro: `Falha ao falar com a API: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
    return gravar(camposResposta(resposta));
  } catch {
    return { status: null, mensagem: "Erro inesperado ao emitir a nota." };
  }
}

/** Consulta a nota no provedor e atualiza (webhook e fallback do cron). */
export async function sincronizarNota(
  db: DB,
  nota: { id: string; referencia: string; status: StatusNota },
): Promise<StatusNota> {
  const provedor = escolherProvedor(await carregarConfigFiscal(db));
  if (!provedor) return nota.status;
  const r = await provedor.consultar(nota.referencia);
  if (!podeTransicionar(nota.status, r.status) || r.status === nota.status) {
    return nota.status;
  }
  await db.from("notas_fiscais").update(camposResposta(r)).eq("id", nota.id);
  return r.status;
}

/** Cron: notas "processando" há mais de 1 hora sem retorno do webhook. */
export async function sincronizarNotasPendentes(db: DB): Promise<number> {
  const umaHoraAtras = new Date(Date.now() - 3_600_000).toISOString();
  const { data } = await db
    .from("notas_fiscais")
    .select("id, referencia, status")
    .eq("status", "processando")
    .lt("atualizado_em", umaHoraAtras)
    .limit(50);
  let atualizadas = 0;
  for (const n of (data ?? []) as { id: string; referencia: string; status: StatusNota }[]) {
    try {
      if ((await sincronizarNota(db, n)) !== n.status) atualizadas += 1;
    } catch {
      /* tenta de novo no próximo cron */
    }
  }
  return atualizadas;
}

/** Cancela uma nota autorizada (justificativa já validada pela ação). */
export async function cancelarNotaFiscal(
  db: DB,
  notaId: string,
  justificativa: string,
): Promise<{ ok: boolean; mensagem: string }> {
  const { data } = await db
    .from("notas_fiscais")
    .select("id, referencia, status")
    .eq("id", notaId)
    .maybeSingle();
  if (!data) return { ok: false, mensagem: "Nota não encontrada." };
  if (data.status !== "autorizada") {
    return { ok: false, mensagem: "Só é possível cancelar nota autorizada." };
  }
  const provedor = escolherProvedor(await carregarConfigFiscal(db));
  if (!provedor) {
    return {
      ok: false,
      mensagem: "Emissão desativada: cancele pelo painel da Focus NFe ou da prefeitura.",
    };
  }
  let r: RespostaNfse;
  try {
    r = await provedor.cancelar(data.referencia as string, justificativa);
  } catch (e) {
    return { ok: false, mensagem: `Falha ao falar com a API: ${e instanceof Error ? e.message : e}` };
  }
  if (r.status !== "cancelada") {
    await db
      .from("notas_fiscais")
      .update({ mensagem_erro: r.mensagem_erro, atualizado_em: new Date().toISOString() })
      .eq("id", notaId);
    return { ok: false, mensagem: r.mensagem_erro ?? "Cancelamento recusado." };
  }
  await db
    .from("notas_fiscais")
    .update({
      status: "cancelada",
      cancelada_em: new Date().toISOString(),
      justificativa_cancelamento: justificativa,
      mensagem_erro: null,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", notaId);
  return { ok: true, mensagem: "Nota cancelada." };
}
