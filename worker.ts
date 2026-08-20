// @ts-nocheck — o import abaixo só existe depois de `opennextjs-cloudflare build`
// (a pasta .open-next é gerada). O wrangler faz o bundle; o tsc ignora este arquivo
// (está no `exclude` do tsconfig).
import worker from "./.open-next/worker.js";

/**
 * Entrypoint customizado do Worker: repassa o tráfego HTTP para o app Next
 * gerado pelo OpenNext e adiciona o handler `scheduled` (Cron Trigger do
 * Cloudflare — agenda em wrangler.jsonc → triggers.crons).
 *
 * O cron chama as próprias rotas /api/cron/* com o Bearer CRON_SECRET,
 * exatamente como um agendador externo faria — a autorização da rota continua
 * valendo. Isso também mantém o Supabase Free ativo (batida diária no banco).
 */
const ROTA_POR_CRON: Record<string, string> = {
  "0 6 * * *": "/api/cron/renovar",
  "10 6 * * *": "/api/cron/backup",
};

export default {
  fetch: worker.fetch,

  async scheduled(controller, env, ctx) {
    const rota = ROTA_POR_CRON[controller.cron] ?? "/api/cron/renovar";
    const base = env.NEXT_PUBLIC_SITE_URL ?? "https://localhost";
    const req = new Request(`${base}${rota}`, {
      headers: { authorization: `Bearer ${env.CRON_SECRET ?? ""}` },
    });
    const res = await worker.fetch(req, env, ctx);
    console.log(`cron ${rota}: HTTP ${res.status} — ${await res.text()}`);
  },
};
