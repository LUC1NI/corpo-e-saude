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

## 1.1 Trocar para domínio próprio (ex.: `app.corpoesaude.com.br`)

O endereço do site vem de **uma variável só**: `NEXT_PUBLIC_SITE_URL` no
`wrangler.jsonc`. Links, QR code da recepção, metadata/SEO, sitemap e os
links dos e-mails de senha derivam dela. Nenhum código muda.

> Por que precisa publicar de novo: o Next grava os `NEXT_PUBLIC_*` no código
> durante o build. O `npm run deploy:cf` já faz o build lendo os `vars` do
> `wrangler.jsonc` (script `scripts/com-vars-wrangler.mjs`), então basta
> editar o arquivo e publicar. O `.env.local` (localhost) não vaza mais para
> produção.

1. **Cloudflare → domínio:** o domínio precisa estar numa zona da sua conta
   Cloudflare (DNS gerenciado pela Cloudflare). Depois: Workers & Pages →
   `corpo-e-saude` → Settings → Domains & Routes → **Add → Custom domain** →
   `app.seudominio.com.br`. A Cloudflare cria o DNS e o certificado HTTPS
   sozinha (leva alguns minutos).
2. **`wrangler.jsonc`:** troque `"NEXT_PUBLIC_SITE_URL"` para
   `https://app.seudominio.com.br` (sem barra no final).
3. **Supabase → Authentication → URL Configuration:**
   - **Site URL** = `https://app.seudominio.com.br`
   - **Redirect URLs**: adicione `https://app.seudominio.com.br/auth/callback`
     (pode manter a do `workers.dev` durante a transição).
4. **Publicar:** `npm run deploy:cf`. Na saída aparece
   `> NEXT_PUBLIC_SITE_URL=...` confirmando o endereço usado no build.
5. **Conferir:** abrir `https://app.seudominio.com.br/robots.txt` (o sitemap
   deve citar o domínio novo), testar "esqueci minha senha" (o link do e-mail
   deve abrir o domínio novo) e **reimprimir o QR code** da recepção
   (Admin → Acesso dos alunos), que agora aponta para o endereço novo.
6. Quem já instalou o app pelo endereço antigo precisa instalar de novo pelo
   novo (o PWA fica preso à origem em que foi instalado). As notificações
   também: cada aluno reativa no endereço novo.

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
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Client + Server | Chave pública do Web Push |
| `VAPID_PRIVATE_KEY` | **Server** | Segredo (JWK em JSON) do Web Push |
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

## 5.1 Notificações push (Web Push)

Avisos de mensalidade (3 dias antes, no dia, 3 dias depois de vencer, uma
vez só cada) e de treino atualizado (aluno online). Saem do cron diário e
das ações de treino, pelo `src/lib/push.ts`. Testado com envio real (FCM)
de dentro do runtime do Workers.

**Chaves VAPID** (um par por sistema; trocar o par invalida as inscrições
existentes, os alunos teriam de reativar):

1. Gerar: `npx @pushforge/builder vapid` (imprime a pública e a privada em
   JSON/JWK).
2. Pública: em `wrangler.jsonc` → `vars.NEXT_PUBLIC_VAPID_PUBLIC_KEY` (e no
   `.env.local`).
3. Privada: **só** como secret, nunca no repo:
   `npx wrangler secret put VAPID_PRIVATE_KEY` e cole o JSON inteiro
   (`{"alg":"ES256",...,"d":"..."}`). No `.env.local` vai na linha
   `VAPID_PRIVATE_KEY=`.
4. `npm run deploy:cf`.

> O par atual já foi gerado: a pública está no `wrangler.jsonc` e a privada
> no seu `.env.local`. Falta só o passo 3 (secret) e publicar.

Sem as chaves, o sistema funciona normalmente e só não envia avisos. No
iPhone, o aluno precisa ter adicionado o app à tela de início (iOS 16.4+).

---

## 6. Backup automático (LGPD / dados sensíveis)

O sistema guarda dados financeiros e de saúde (anamnese). O **plano Free do
Supabase não inclui backup automático** (só a partir do Pro, US$25/mês) — para
não gerar custo mensal, montamos um backup próprio, sem custo:

- **Cron diário (06:10 UTC)**, já agendado no `wrangler.jsonc` junto com o de
  renovação, bate em `/api/cron/backup` (`src/app/api/cron/backup/route.ts`).
- A rota (`src/lib/backup.ts`) exporta **todas as tabelas de dado real** em um
  único JSON e sobe pro bucket privado `backups` do próprio Supabase Storage
  (plano Free inclui 1 GB — de sobra para isso).
- Mantém os **últimos 14 dumps** e apaga o resto sozinho.
- **Restauração:** é manual (baixar o JSON do bucket e reinserir via script) —
  não é um PITR de verdade. Se o estúdio crescer e o custo deixar de ser
  problema, migrar para o **Supabase Pro** dá PITR de verdade e restauração
  em 1 clique; até lá, isto cobre a lacuna.
- Teste a restauração manual ao menos uma vez para saber o caminho na hora
  que precisar.

---

## 6.1 Monitoramento de erros (sem custo)

Sentry (o padrão de mercado) tem plano gratuito (5 mil erros/mês), mas exige
criar uma conta nova — isso fica pra você decidir/fazer quando quiser, não é
algo que dá pra automatizar sem sua ação. Enquanto isso, o sistema já loga
erros sozinho, sem depender de conta de terceiro:

- Tabela `logs_erro` no próprio Supabase (migration `20260820000001`).
- Erros de servidor (crons) e de tela (client, via `error.tsx` /
  `global-error.tsx` → `POST /api/log-erro`, com rate limit por IP) caem lá.
- Veja em **`/admin/erros`** (não está no menu lateral de propósito, pra não
  poluir o dia a dia — acesse direto pela URL quando quiser checar).

**Se no futuro quiser upgrade para Sentry** (opcional, gratuito até 5 mil
erros/mês, 1 usuário): criar conta em sentry.io → projeto Next.js → `npx
@sentry/wizard@latest -i nextjs` → cole o DSN gerado. Ele substitui/completa
o log caseiro, com replay de sessão e alertas por e-mail.

Uptime (o site cair de madrugada e ninguém saber): **UptimeRobot** tem plano
gratuito (50 monitores, checagem a cada 5 min, alerta por e-mail) — também
exige conta própria, então fica documentado aqui como próximo passo opcional:
criar conta grátis em uptimerobot.com → adicionar monitor HTTP(s) apontando
para `https://corpo-e-saude.lucinij3.workers.dev/`.

---

## 7. Checklist de segurança (pré go-live)

- [ ] RLS habilitado em **todas** as tabelas (conferir no Supabase).
- [ ] `service_role` só em env de servidor; ausente do bundle do client.
- [ ] `CRON_SECRET` definido e a rota do cron retornando 401 sem ele.
- [ ] HTTPS no domínio (obrigatório p/ PWA e cookies seguros).
- [ ] Site URL / Redirect URLs do Supabase apontando para produção.
- [ ] Rate limit durável ativo (tabela `rate_limits` + função `rl_hit`).
- [ ] Senha do admin inicial trocada (não-provisória).
- [x] Backup diário automático (cron → Supabase Storage) — ver seção 6. Teste
      a restauração manual ao menos uma vez.
- [ ] (Opcional) Sentry e/ou UptimeRobot configurados — ver seção 6.1.

---

## 8. Pós-deploy (fumaça)

1. Login do admin → troca de senha no 1º acesso.
2. Criar plano → aluno → matrícula → "Gerar cobranças".
3. Login do aluno → ver Treino de hoje, Evolução, Mensalidade.
4. Instalar o PWA pelo celular ("Adicionar à tela de início").
5. Disparar o cron manualmente (com o Bearer) e conferir as cobranças.
