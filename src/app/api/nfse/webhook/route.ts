import { NextResponse } from "next/server";
import { z } from "zod";

import { autorizarWebhookNfse } from "@/lib/cron-auth";
import { registrarErro } from "@/lib/logs";
import { sincronizarNota } from "@/lib/nfse/servico";
import type { StatusNota } from "@/lib/nfse/regras";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Webhook (gatilho) da Focus NFe: avisa que uma nota mudou de status.
 *
 * Segurança em duas camadas: (1) segredo NFSE_WEBHOOK_SECRET comparado em
 * tempo constante; (2) o corpo NÃO é confiado: usamos só a `ref` e
 * consultamos a Focus com o nosso token (fonte da verdade). Um POST forjado
 * no máximo dispara uma consulta.
 */
export async function POST(request: Request): Promise<Response> {
  const autorizacao = autorizarWebhookNfse(request);
  if (!autorizacao.ok) {
    return NextResponse.json({ ok: false, erro: autorizacao.erro }, { status: autorizacao.status });
  }

  const corpo = z
    .object({ ref: z.string().min(1).max(100) })
    .safeParse(await request.json().catch(() => null));
  if (!corpo.success) {
    return NextResponse.json({ ok: false, erro: "Corpo inválido." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data: nota } = await admin
      .from("notas_fiscais")
      .select("id, referencia, status")
      .eq("referencia", corpo.data.ref)
      .maybeSingle();
    // Ref desconhecida: responde 200 para a Focus não ficar reenviando.
    if (!nota) return NextResponse.json({ ok: true, ignorado: true });
    const status = await sincronizarNota(
      admin,
      nota as { id: string; referencia: string; status: StatusNota },
    );
    return NextResponse.json({ ok: true, status });
  } catch (e) {
    await registrarErro("nfse/webhook", e, { ref: corpo.data.ref });
    return NextResponse.json({ ok: false, erro: "Falha ao processar." }, { status: 500 });
  }
}
