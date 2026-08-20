import { NextResponse } from "next/server";
import { z } from "zod";

import { registrarErro } from "@/lib/logs";
import { rateLimit } from "@/lib/rate-limit";
import { clienteIp } from "@/lib/request-ip";

export const dynamic = "force-dynamic";

const corpoSchema = z.object({
  origem: z.string().trim().min(1).max(80),
  mensagem: z.string().trim().min(1).max(500),
  url: z.string().trim().max(300).optional(),
});

/**
 * Recebe erros não tratados do client (error.tsx / global-error.tsx) e
 * guarda em `logs_erro` — monitoramento sem custo, sem Sentry. Rota pública
 * (o erro acontece antes de qualquer garantia de sessão), por isso com
 * rate limit por IP para não virar porta de abuso.
 */
export async function POST(request: Request): Promise<Response> {
  const ip = await clienteIp();
  const rl = await rateLimit(`log-erro:${ip}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const parsed = corpoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await registrarErro(`client:${parsed.data.origem}`, parsed.data.mensagem, {
    url: parsed.data.url,
  });
  return NextResponse.json({ ok: true });
}
