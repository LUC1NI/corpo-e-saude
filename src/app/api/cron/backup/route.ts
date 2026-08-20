import { NextResponse } from "next/server";

import { executarBackup } from "@/lib/backup";
import { autorizarCron } from "@/lib/cron-auth";
import { registrarErro } from "@/lib/logs";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Cron de backup diário. Dump de todas as tabelas em JSON, guardado no
 * Supabase Storage (bucket `backups`). Protegido por `CRON_SECRET` (Bearer),
 * igual à rota de renovação.
 *
 *   GET /api/cron/backup   com  Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request): Promise<Response> {
  const autorizacao = autorizarCron(request);
  if (!autorizacao.ok) {
    return NextResponse.json({ ok: false, erro: autorizacao.erro }, { status: autorizacao.status });
  }

  try {
    const supabase = createAdminClient();
    const resultado = await executarBackup(supabase);
    return NextResponse.json({ ok: true, ...resultado });
  } catch (e) {
    console.error("cron/backup falhou:", e);
    await registrarErro("cron/backup", e);
    return NextResponse.json(
      { ok: false, erro: "Falha ao gerar backup." },
      { status: 500 },
    );
  }
}
