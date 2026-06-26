import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

/**
 * Cria um usuário de acesso (auth + linha em `usuarios` e, se for o caso,
 * em `professores`/`alunos`). Usa a service_role — rode só localmente.
 *
 * Uso:
 *   npm run criar-usuario -- <papel> <email> <senha> [nome] [provisoria]
 *
 *   papel      admin | professor | aluno
 *   provisoria  passe "provisoria" para exigir troca de senha no 1º acesso
 *
 * Exemplos:
 *   npm run criar-usuario -- admin dono@studio.com Senha123
 *   npm run criar-usuario -- professor prof@studio.com Senha123 "Ana Personal"
 *   npm run criar-usuario -- aluno joao@aluno.com Prov123 "João Silva" provisoria
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnvLocal() {
  try {
    const raw = readFileSync(path.join(root, ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      )
        v = v.slice(1, -1);
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {
    /* segue com process.env */
  }
}

loadEnvLocal();

const [, , papel, email, senha, nome, flag] = process.argv;

if (!["admin", "professor", "aluno"].includes(papel) || !email || !senha) {
  console.error(
    "Uso: npm run criar-usuario -- <admin|professor|aluno> <email> <senha> [nome] [provisoria]",
  );
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRole) {
  console.error("✗ Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const provisoria = flag === "provisoria";
const supabase = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: criado, error: errAuth } = await supabase.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { senha_provisoria: provisoria },
  });
  if (errAuth) throw errAuth;
  const userId = criado.user.id;

  const { error: errUsuario } = await supabase
    .from("usuarios")
    .insert({ id: userId, email, papel, ativo: true });
  if (errUsuario) throw errUsuario;

  if (papel === "professor") {
    const { error } = await supabase
      .from("professores")
      .insert({ usuario_id: userId, nome: nome ?? email });
    if (error) throw error;
  } else if (papel === "aluno") {
    const { error } = await supabase
      .from("alunos")
      .insert({ usuario_id: userId, nome: nome ?? email, tipo: "presencial" });
    if (error) throw error;
  }

  console.log(`✓ ${papel} criado: ${email}`);
  console.log(`  user_id: ${userId}`);
  console.log(`  senha provisória: ${provisoria ? "sim (troca no 1º acesso)" : "não"}`);
}

main().catch((err) => {
  console.error("✗ Erro:", err.message ?? err);
  process.exit(1);
});
