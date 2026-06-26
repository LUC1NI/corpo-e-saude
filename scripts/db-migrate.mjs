import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

/**
 * Aplica as migrations SQL de `supabase/migrations/` ao banco do Supabase,
 * em ordem alfabética, dentro de uma transação por arquivo. Registra o que
 * já foi aplicado na tabela `public._migrations`, então pode rodar de novo
 * com segurança (idempotente).
 *
 * Requer a connection string em `SUPABASE_DB_URL` (no `.env.local`):
 *   SUPABASE_DB_URL=postgresql://postgres.<ref>:<senha>@<host>:5432/postgres
 * Pegue em: Supabase → Settings → Database → Connection string → URI.
 *
 * Uso: npm run db:migrate
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const migrationsDir = path.join(root, "supabase", "migrations");

// Carrega variáveis do .env.local (parser simples, sem dependências).
function loadEnvLocal() {
  try {
    const raw = readFileSync(path.join(root, ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env.local pode não existir — segue com process.env mesmo.
  }
}

loadEnvLocal();

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error(
    "\n✗ SUPABASE_DB_URL não definido.\n" +
      "  Adicione no .env.local a connection string (URI) do Supabase:\n" +
      "  Settings → Database → Connection string → URI\n",
  );
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();

  await client.query(`
    create table if not exists public._migrations (
      nome text primary key,
      aplicada_em timestamptz not null default now()
    );
  `);

  const aplicadas = new Set(
    (await client.query("select nome from public._migrations")).rows.map(
      (r) => r.nome,
    ),
  );

  const arquivos = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let novas = 0;
  for (const arquivo of arquivos) {
    if (aplicadas.has(arquivo)) {
      console.log(`• ${arquivo} (já aplicada)`);
      continue;
    }
    const sql = readFileSync(path.join(migrationsDir, arquivo), "utf8");
    process.stdout.write(`→ aplicando ${arquivo} ... `);
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query(
        "insert into public._migrations (nome) values ($1)",
        [arquivo],
      );
      await client.query("commit");
      console.log("ok");
      novas++;
    } catch (err) {
      await client.query("rollback");
      console.log("FALHOU");
      throw err;
    }
  }

  console.log(
    novas === 0
      ? "\nBanco já está atualizado."
      : `\n${novas} migration(s) aplicada(s) com sucesso.`,
  );
}

main()
  .catch((err) => {
    console.error("\n✗ Erro ao migrar:", err.message);
    process.exitCode = 1;
  })
  .finally(() => client.end());
