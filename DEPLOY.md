# Deploy — Corpo & Saúde

Guia de colocar o sistema no ar (produção). A stack é **Next.js + Supabase**;
o deploy recomendado é na **Vercel** (suporta os Vercel Crons usados pela
renovação automática).

---

## 1. Pré-requisitos

- Projeto **Supabase** criado (Postgres + Auth + Storage).
- Repositório no GitHub/GitLab conectado à **Vercel**.
- As **migrations** aplicadas no banco de produção (`npm run db:migrate`).

---

## 2. Variáveis de ambiente (produção)

Defina na Vercel (Project → Settings → Environment Variables) — veja
`.env.local.example` para referência:

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

A Vercel usa o `vercel.json` (já no repo):

```json
{ "buildCommand": "next build --webpack" }
```

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

Já configurado no `vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/renovar", "schedule": "0 6 * * *" }] }
```

- Roda diariamente ~06:00 UTC (~03:00 BRT).
- A rota `/api/cron/renovar` exige `Authorization: Bearer <CRON_SECRET>` — a
  Vercel injeta isso automaticamente quando `CRON_SECRET` está definido.
- Gera os `pagamentos` pendentes (catch-up por período em atraso) e marca os
  vencidos. A ação manual "Gerar cobranças" no painel continua disponível.

**Sem Vercel?** Aponte qualquer agendador (cron-job.org, GitHub Actions) para
um `GET https://SEU-DOMINIO/api/cron/renovar` com o header
`Authorization: Bearer <CRON_SECRET>`.

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
