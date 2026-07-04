import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

/**
 * Seed de PROFESSORES DEMO: cria 2 professores extras (Eduardo e Cris) com
 * grade de horários variada, para testar a "Grade de horários" do admin com
 * vários professores lado a lado. Idempotente (busca por e-mail). Demo/local.
 *
 *   npm run seed:professores
 *
 * Login dos demo: eduardo.demo@studio.com / cris.demo@studio.com — senha Demo@1234
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
for (const line of readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  const k = t.slice(0, i).trim();
  let v = t.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!(k in process.env)) process.env[k] = v;
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const SENHA = "Demo@1234";

// [dia_semana (0=dom), hora_inicio, hora_fim, capacidade]
const PROFS = [
  {
    nome: "Eduardo Personal",
    email: "eduardo.demo@studio.com",
    horarios: [
      [2, "07:00", "08:00", 4],
      [2, "09:00", "10:00", 4],
      [4, "07:00", "08:00", 4],
      [1, "18:00", "19:00", 6],
    ],
  },
  {
    nome: "Cris Personal",
    email: "cris.demo@studio.com",
    horarios: [
      [2, "08:00", "09:00", 5],
      [2, "18:00", "19:00", 6],
      [3, "07:00", "08:00", 5],
      [5, "06:00", "07:00", 5],
    ],
  },
];

async function acharUsuarioPorEmail(email) {
  // Procura nas páginas do Auth (poucos usuários no demo).
  for (let page = 1; page <= 5; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 200 });
    const u = data?.users?.find((x) => x.email === email);
    if (u) return u;
    if (!data?.users?.length || data.users.length < 200) break;
  }
  return null;
}

async function main() {
  for (const p of PROFS) {
    // 1. Usuário no Auth (cria se não existir).
    let authUser = await acharUsuarioPorEmail(p.email);
    if (!authUser) {
      const { data, error } = await db.auth.admin.createUser({
        email: p.email,
        password: SENHA,
        email_confirm: true,
        user_metadata: { nome: p.nome },
      });
      if (error) throw new Error(`Auth ${p.email}: ${error.message}`);
      authUser = data.user;
    }

    // 2. Linha em usuarios (papel professor).
    await db
      .from("usuarios")
      .upsert(
        { id: authUser.id, email: p.email, papel: "professor", ativo: true },
        { onConflict: "id" },
      );

    // 3. Linha em professores.
    let { data: prof } = await db
      .from("professores")
      .select("id")
      .eq("usuario_id", authUser.id)
      .maybeSingle();
    if (!prof) {
      const { data } = await db
        .from("professores")
        .insert({ usuario_id: authUser.id, nome: p.nome, ativo: true })
        .select("id")
        .single();
      prof = data;
    }

    // 4. Horários (recria a grade do professor demo).
    await db.from("horarios").delete().eq("professor_id", prof.id);
    await db.from("horarios").insert(
      p.horarios.map(([dia, ini, fim, cap]) => ({
        professor_id: prof.id,
        dia_semana: dia,
        hora_inicio: ini,
        hora_fim: fim,
        capacidade: cap,
      })),
    );

    console.log(`✓ ${p.nome} (${p.email}) — ${p.horarios.length} horário(s).`);
  }

  console.log(`\n✅ Professores demo prontos. Senha de login: ${SENHA}`);
}

main().catch((e) => { console.error("\n✗ Erro:", e.message ?? e); process.exit(1); });
