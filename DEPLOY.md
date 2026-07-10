# Deploy — Corpo & Saúde

Guia de colocar o sistema no ar (produção). A stack é **Next.js + Supabase**;
o deploy recomendado é no **Cloudflare Workers** via OpenNext (a Vercel Hobby
proíbe uso comercial; o plano pago da Vercel fica como alternativa).

---

## 1. Deploy no Cloudflare Workers (recomendado)

Já está tudo configurado no repo: `wrangler.jsonc` (config do worker),
`open-next.config.ts` (adapter) e `worker.ts` (entrypoint que adiciona o
cron de renovação). O bundle atual tem ~2,1 MiB gzip — cabe no plano Free
(limite 3 MiB).

### Passo a passo (primeira vez)

1. **Login na Cloudflare** (abre o navegador):
   ```bash
   npx wrangler login
   ```
2. **Preencha os `vars` públicos** em `wrangler.jsonc`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `NEXT_PUBLIC_SITE_URL`) — são os mesmos do `.env.local`. A anon key é
   pública por design; **segredo nenhum entra nesse arquivo**.
3. **Cadastre os segredos** (ficam só na Cloudflare, fora do repo):
   ```bash
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   npx wrangler secret put CRON_SECRET
   ```
4. **Migrations e admin** no banco de produção (seções 4 e 5 abaixo).
5. **Deploy:**
   ```bash
   npm run deploy:cf
   ```
   A URL sai no final (ex.: `https://corpo-e-saude.SEU-SUBDOMINIO.workers.dev`).
6. **Ajuste pós-1º deploy:** atualize `NEXT_PUBLIC_SITE_URL` no
   `wrangler.jsonc` com a URL real e rode `npm run deploy:cf` de novo.
   No Supabase (Auth → URL Configuration), inclua essa URL em **Site URL** e
   **Redirect URLs** (`https://.../auth/callback`) — senão reset de senha e
   primeiro acesso quebram.

Para testar localmente no runtime do Workers antes de publicar:
`npm run preview:cf`.

### Cron (renovação automática) no Cloudflare

O `wrangler.jsonc` agenda `0 6 * * *` (≈ 03:00 em Mafra/SC). O Cron Trigger
chama o handler `scheduled` do `worker.ts`, que bate na rota
`/api/cron/renovar` com o `Bearer CRON_SECRET` — a mesma proteção de sempre.
Esse toque diário no banco também **substitui o keep-alive** do Supabase Free
(a GitHub Action `keep-alive.yml` só é necessária se o repo estiver no GitHub;
sem remote, o cron do worker já cumpre o papel).

> **Nota técnica:** o middleware do app usa o formato legado `middleware.ts`
> (runtime Edge) de propósito — o `proxy.ts` do Next 16 roda sempre em
> Node.js, que o OpenNext/Cloudflare não suporta. Não renomeie de volta.

---

## 2. Variáveis de ambiente (produção)

No Cloudflare: `vars` públicos no `wrangler.jsonc` + segredos via
`wrangler secret put` (passo a passo acima). Na Vercel: Project → Settings →
Environment Variables. Veja `.env.local.example` para referência:

| Variável | Onde | Observação |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | **Somente** a anon key no client |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server** | Segredo. Nunca expor no front |
| `NEXT_PUBLIC_SITE_URL` | Client + Server | Ex.: `https://app.corpoesaude.com` |
| `CRON_SECRET` | **Server** | Segredo aleatório forte (cron) |
| `SUPABASE_DB_URL` | Local apenas | Só para rodar migrations |

> A `service_role` e o `CRON_SECRET` são segredos: marque o escopo como
> *Production* (e *Preview* se for testar) e nunca commite.

No Supabase (Auth → URL Configuration), inclua o domínio de produção em
**Site URL** e **Redirect URLs** (`https://SEU-DOMINIO/auth/callback`), senão
o reset de senha / primeiro acesso quebra.

---

## 3. Build

- **Cloudflare:** `npm run deploy:cf` roda `opennextjs-cloudflare build`
  (que executa o script `build` do package.json) e publica com o wrangler.
- **Vercel (alternativa):** usa o `vercel.json` (já no repo):
  `{ "buildCommand": "next build --webpack" }`.

O `--webpack` é necessário: o PWA (Serwist) injeta a config webpack para gerar
o `public/sw.js`. O service worker é registrado automaticamente em produção.

---

## 4. Migrations do banco

Rode contra o banco de produção (com `SUPABASE_DB_URL` apontando para ele):

```bash
npm run db:migrate
```

É idempotente (controla o que já foi aplicado em `public._migrations`).
Confirme que o **RLS está ligado em todas as tabelas** (já vem nas migrations).

### Usuário admin inicial

```bash
npm run criar-usuario -- admin dono@studio.com SenhaForte123 "Nome do Dono" provisoria
```

(`provisoria` força a troca de senha no primeiro acesso.)

---

## 5. Renovação automática (cron)

- **Cloudflare (recomendado):** já agendado no `wrangler.jsonc`
  (`triggers.crons`) — ver seção 1.
- **Vercel:** o `vercel.json` agenda o mesmo horário; a Vercel injeta o
  `Bearer CRON_SECRET` automaticamente.
- **Qualquer outro agendador** (cron-job.org, GitHub Actions): aponte para
  `GET https://SEU-DOMINIO/api/cron/renovar` com o header
  `Authorization: Bearer <CRON_SECRET>`.

Em todos os casos: roda diariamente ~06:00 UTC (~03:00 BRT), gera os
`pagamentos` pendentes (catch-up por período em atraso) e marca os vencidos.
A ação manual "Gerar cobranças" no painel continua disponível.

---

## 6. Backup automático (LGPD / dados sensíveis)

O sistema guarda dados financeiros e de saúde (anamnese). Configure no Supabase
**antes do go-live**:

- **Database → Backups**: habilite o **PITR (Point-in-Time Recovery)** ou os
  **backups diários** (depende do plano). Guarde a política de retenção.
- Faça um **teste de restauração** ao menos uma vez.
- Opcional: export periódico (`pg_dump` via `SUPABASE_DB_URL`) para um destino
  externo, se quiser uma cópia fora do Supabase.

---

## 7. Checklist de segurança (pré go-live)

- [ ] RLS habilitado em **todas** as tabelas (conferir no Supabase).
- [ ] `service_role` só em env de servidor; ausente do bundle do client.
- [ ] `CRON_SECRET` definido e a rota do cron retornando 401 sem ele.
- [ ] HTTPS no domínio (obrigatório p/ PWA e cookies seguros).
- [ ] Site URL / Redirect URLs do Supabase apontando para produção.
- [ ] Rate limit durável ativo (tabela `rate_limits` + função `rl_hit`).
- [ ] Senha do admin inicial trocada (não-provisória).
- [ ] Backups/PITR ligados e testados.

---

## 8. Pós-deploy (fumaça)

1. Login do admin → troca de senha no 1º acesso.
2. Criar plano → aluno → matrícula → "Gerar cobranças".
3. Login do aluno → ver Treino de hoje, Evolução, Mensalidade.
4. Instalar o PWA pelo celular ("Adicionar à tela de início").
5. Disparar o cron manualmente (com o Bearer) e conferir as cobranças.
