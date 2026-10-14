import { buildPushHTTPRequest } from "@pushforge/builder";
import type { SupabaseClient } from "@supabase/supabase-js";

import { hojeISO } from "@/lib/financeiro";
import {
  janelaLembretes,
  lembreteDoPagamento,
  textoLembrete,
} from "@/lib/lembretes";
import { registrarErro } from "@/lib/logs";
import { SITE_URL } from "@/lib/site";

/**
 * Envio de Web Push (só servidor, com o client service_role).
 *
 * Biblioteca: @pushforge/builder (Web Crypto, zero dependências). A `web-push`
 * clássica depende de `crypto`/`https` do Node e não roda no Workers.
 *
 * Chaves VAPID: pública em NEXT_PUBLIC_VAPID_PUBLIC_KEY, privada (JWK em JSON)
 * no secret VAPID_PRIVATE_KEY. Sem elas, o envio é ignorado em silêncio.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type DB = SupabaseClient<any, any, any>;

export interface AvisoPush {
  titulo: string;
  corpo: string;
  /** Caminho interno aberto ao tocar (ex.: "/aluno/mensalidade"). */
  url: string;
  /** Avisos com a mesma tag substituem o anterior na bandeja. */
  tag: string;
}

type TipoNotificacao =
  | "mensalidade_antes"
  | "mensalidade_dia"
  | "mensalidade_atraso"
  | "treino_novo";

export function pushConfigurado(): boolean {
  return !!process.env.VAPID_PRIVATE_KEY && !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
}

/**
 * Envia um aviso para todos os aparelhos do aluno. Com `trava`, grava antes em
 * `notificacoes_enviadas`: se o mesmo (tipo, referencia) já existe, não envia
 * de novo. Nunca lança (aviso não pode derrubar quem chamou).
 * Retorna quantos aparelhos receberam.
 */
export async function enviarPushAluno(
  admin: DB,
  alunoId: string,
  aviso: AvisoPush,
  trava?: { tipo: TipoNotificacao; referencia: string },
): Promise<number> {
  if (!pushConfigurado()) return 0;
  try {
    const { data: aluno } = await admin
      .from("alunos")
      .select("usuario_id")
      .eq("id", alunoId)
      .maybeSingle();
    if (!aluno?.usuario_id) return 0; // aluno sem acesso ao app

    const { data: inscricoes } = await admin
      .from("push_inscricoes")
      .select("id, endpoint, p256dh, auth")
      .eq("usuario_id", aluno.usuario_id);
    if (!inscricoes?.length) return 0;

    if (trava) {
      const { error } = await admin.from("notificacoes_enviadas").insert({
        aluno_id: alunoId,
        tipo: trava.tipo,
        referencia_id: trava.referencia,
      });
      if (error?.code === "23505") return 0; // já enviado antes
      if (error) throw new Error(error.message);
    }

    let enviados = 0;
    for (const i of inscricoes as {
      id: string;
      endpoint: string;
      p256dh: string;
      auth: string;
    }[]) {
      const status = await enviarParaInscricao(i, aviso);
      if (status === 404 || status === 410) {
        // Inscrição morta (app desinstalado / permissão revogada).
        await admin.from("push_inscricoes").delete().eq("id", i.id);
      } else if (status >= 200 && status < 300) {
        enviados += 1;
      } else {
        await registrarErro("push", `push service respondeu ${status}`, {
          host: new URL(i.endpoint).host,
        });
      }
    }
    return enviados;
  } catch (e) {
    await registrarErro("push", e, { alunoId });
    return 0;
  }
}

async function enviarParaInscricao(
  i: { endpoint: string; p256dh: string; auth: string },
  aviso: AvisoPush,
): Promise<number> {
  const { endpoint, headers, body } = await buildPushHTTPRequest({
    privateJWK: process.env.VAPID_PRIVATE_KEY!,
    subscription: { endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } },
    message: {
      payload: {
        title: aviso.titulo,
        body: aviso.corpo,
        url: aviso.url,
        tag: aviso.tag,
      },
      adminContact: SITE_URL,
      options: { ttl: 24 * 60 * 60, urgency: "normal" },
    },
  });
  const res = await fetch(endpoint, { method: "POST", headers, body });
  return res.status;
}

/**
 * Lembretes de mensalidade (cron diário, depois da renovação): 3 dias antes,
 * no dia e 3 dias após vencer. Retorna quantos avisos saíram.
 */
export async function enviarLembretesMensalidade(admin: DB): Promise<number> {
  if (!pushConfigurado()) return 0;
  const hoje = hojeISO();
  const { de, ate } = janelaLembretes(hoje);
  const { data } = await admin
    .from("pagamentos")
    .select("id, aluno_id, vencimento, valor")
    .neq("status", "pago")
    .gte("vencimento", de)
    .lte("vencimento", ate);

  let total = 0;
  for (const p of (data ?? []) as {
    id: string;
    aluno_id: string;
    vencimento: string;
    valor: number;
  }[]) {
    const tipo = lembreteDoPagamento(p.vencimento, hoje);
    if (!tipo) continue;
    const { titulo, corpo } = textoLembrete(tipo, p.vencimento, Number(p.valor));
    total += await enviarPushAluno(
      admin,
      p.aluno_id,
      { titulo, corpo, url: "/aluno/mensalidade", tag: `mensalidade-${p.id}` },
      { tipo, referencia: p.id },
    );
  }
  return total;
}

/**
 * Aviso de treino novo/alterado para aluno ONLINE com ficha ativa. No máximo
 * um por ficha por dia (o professor costuma fazer várias edições seguidas).
 */
export async function avisarTreinoAtualizado(
  admin: DB,
  alunoId: string,
): Promise<void> {
  if (!pushConfigurado()) return;
  const { data } = await admin
    .from("alunos")
    .select("tipo, treinos(id, ativo)")
    .eq("id", alunoId)
    .maybeSingle();
  const aluno = data as unknown as {
    tipo: string;
    treinos: { id: string; ativo: boolean }[];
  } | null;
  const ativo = aluno?.treinos.find((t) => t.ativo);
  if (aluno?.tipo !== "online" || !ativo) return;
  await enviarPushAluno(
    admin,
    alunoId,
    {
      titulo: "Seu treino foi atualizado 💪",
      corpo: "Seu professor mexeu na sua ficha. Toque para ver.",
      url: "/aluno/treino",
      tag: "treino",
    },
    { tipo: "treino_novo", referencia: `${ativo.id}:${hojeISO()}` },
  );
}
