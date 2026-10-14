import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Roda um comando com os `vars` do wrangler.jsonc no ambiente.
 *
 * Por quê: o Next grava os `NEXT_PUBLIC_*` no código NO BUILD (não em
 * runtime). Sem isto, o build do deploy lia o `.env.local` (localhost) e o
 * site no ar ficava com links apontando para http://localhost:3000. Variável
 * já presente no ambiente tem prioridade sobre os arquivos .env, então o
 * wrangler.jsonc vira a fonte única do endereço do site.
 *
 * Uso: node scripts/com-vars-wrangler.mjs <comando> [args...]
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bruto = readFileSync(path.join(root, "wrangler.jsonc"), "utf8")
  // Remove comentários de bloco e linhas que são só comentário. (Não remove
  // "//" no meio da linha: as URLs dos vars têm "https://".)
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");
const { vars = {} } = JSON.parse(bruto);

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error("Uso: node scripts/com-vars-wrangler.mjs <comando> [args...]");
  process.exit(1);
}
console.log(`> NEXT_PUBLIC_SITE_URL=${vars.NEXT_PUBLIC_SITE_URL ?? "(não definido)"}`);
const r = spawnSync(cmd, args, {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, ...vars },
});
process.exit(r.status ?? 1);
