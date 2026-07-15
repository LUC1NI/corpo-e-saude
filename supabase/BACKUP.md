# Backup e restauração do banco

Backup lógico **diário, criptografado e de custo zero** do Postgres (Supabase),
feito pelo GitHub Actions (`.github/workflows/backup.yml`).

- **Onde fica:** GitHub → aba **Actions** → workflow *"Backup diário do banco"* →
  cada execução tem um **artifact** `backup-corpo-e-saude-AAAA-MM-DD.sql.gz.gpg`.
- **Retenção:** 90 dias (rolando). Custo: R$0.
- **Segurança:** cifrado em AES256 com a `BACKUP_PASSPHRASE`. Sem essa senha o
  arquivo é ilegível — inclusive pra você. **Guarde-a num gerenciador de senhas.**

---

## 1. Configuração (fazer uma vez)

No GitHub, em **Settings → Secrets and variables → Actions → New repository secret**,
crie os dois segredos:

| Secret | De onde tirar |
|--------|---------------|
| `SUPABASE_DB_URL` | Supabase → **Project Settings → Database → Connection string → "Session pooler"**. É a que funciona com `pg_dump`. Troque `[YOUR-PASSWORD]` pela senha do banco. |
| `BACKUP_PASSPHRASE` | Você inventa uma senha forte só pra cifrar o backup. **Não** reaproveite a senha do banco. Anote em local seguro. |

Depois, teste: **Actions → Backup diário do banco → Run workflow**. Deve terminar
verde e aparecer o artifact na execução.

> Dica: o `keep-alive.yml` já usa `SUPABASE_URL`/`SUPABASE_ANON_KEY`. O backup usa
> outra coisa (`SUPABASE_DB_URL`), porque `pg_dump` conecta direto no Postgres.

---

## 2. Restaurar um backup

Você precisa do **arquivo** (baixado do artifact), da **`BACKUP_PASSPHRASE`** e de
`gpg` + `psql` instalados (o Postgres client; no Windows vem com o instalador do
PostgreSQL, ou use o WSL/Git Bash).

```bash
# 1) Descriptografa e descomprime → gera um .sql legível
gpg --decrypt --batch --passphrase "SUA_BACKUP_PASSPHRASE" \
  backup-corpo-e-saude-2026-07-15.sql.gz.gpg \
  | gunzip > restauracao.sql

# 2) (Opcional) Só espiar o conteúdo antes de restaurar
less restauracao.sql

# 3) Restaura em um banco DESTINO (ex.: um projeto Supabase novo/limpo).
#    Use a connection string "Session pooler" do destino.
psql "postgresql://postgres.<ref>:<senha>@...pooler.supabase.com:5432/postgres" \
  -f restauracao.sql
```

> ⚠️ **Nunca restaure por cima do banco de produção sem certeza.** O ideal é
> restaurar num projeto Supabase **novo/vazio** e conferir os dados antes de
> apontar o app pra ele. Restaurar sobre um banco com dados pode gerar conflitos
> de chave/duplicidade.

### E se eu perder a `BACKUP_PASSPHRASE`?

Não há recuperação — é o objetivo da criptografia. Os backups antigos ficam
inúteis. Guarde a senha com o mesmo cuidado das chaves do sistema.

---

## 3. Limitações (transparência)

- **Retenção de 90 dias.** Cobre o cenário real (recuperar de exclusão acidental,
  corrupção, engano). Para arquivo de longo prazo/legal, **baixe manualmente** um
  backup de vez em quando e guarde offline — continua custando R$0.
- **Backup lógico** (dados + esquema), não um snapshot físico instantâneo. Para o
  porte do estúdio, é o suficiente e o mais portátil.
- O plano Free do Supabase **não** oferece backups restauráveis — por isso este
  workflow existe.
- ⚠️ **Pausa por inatividade (regra do GitHub).** O GitHub **desativa workflows
  agendados após 60 dias sem nenhum commit no repositório**. Enquanto o projeto
  estiver vivo (qualquer commit zera esse contador), o backup roda normal. Se
  ficar 60 dias parado, o GitHub manda um e-mail avisando e basta reativar em
  **Actions → Backup diário do banco → "Enable workflow"** (ou fazer qualquer
  commit). Regra a cada ~2 meses: entre no repo e confira se o backup rodou.
