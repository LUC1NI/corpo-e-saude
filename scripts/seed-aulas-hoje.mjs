import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

/**
 * Seed de "AULAS DE HOJE": garante que o professor tenha horários no dia da
 * semana de HOJE e marca algumas presenças de hoje (mock), para testar a tela
 * de Presença com um cenário realista. Idempotente — pode rodar quantas vezes
 * quiser; ele só recria as presenças de hoje desse professor.
 *
 *   npm run seed:aulas-hoje
 *
 * Usa service_role — rode só localmente.
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

const ISO = (d) => d.toISOString().slice(0, 10);

async function main() {
  const hoje = new Date();
  const hojeISO = ISO(hoje);
  const diaSemana = hoje.getDay(); // 0=domingo ... 6=sábado

  // Professor alvo: "Carlos Personal" (login teste.prof@studio.com) ou o 1º.
  let { data: prof } = await db.from("professores").select("id, nome").eq("nome", "Carlos Personal").maybeSingle();
  if (!prof) {
    const { data } = await db.from("professores").select("id, nome").order("nome").limit(1).maybeSingle();
    prof = data;
  }
  if (!prof) throw new Error("Nenhum professor encontrado. Rode o seed-demo antes.");
  console.log(`Professor: ${prof.nome}`);

  // 1. Garante horários no dia de HOJE (não duplica os já existentes).
  const slotsHoje = [
    { hora_inicio: "06:00", hora_fim: "07:00", capacidade: 6 },
    { hora_inicio: "18:00", hora_fim: "19:00", capacidade: 8 },
  ];
  let nHor = 0;
  for (const s of slotsHoje) {
    const { data: ex } = await db
      .from("horarios")
      .select("id")
      .eq("professor_id", prof.id)
      .eq("dia_semana", diaSemana)
      .eq("hora_inicio", s.hora_inicio)
      .maybeSingle();
    if (!ex) {
      await db.from("horarios").insert({ professor_id: prof.id, dia_semana: diaSemana, ...s });
      nHor++;
    }
  }
  console.log(`✓ Horários de hoje garantidos (${nHor} novo(s)).`);

  // Horários de hoje (ids) para atribuir alunos e marcar presença.
  const { data: horariosHoje } = await db
    .from("horarios")
    .select("id, hora_inicio")
    .eq("professor_id", prof.id)
    .eq("dia_semana", diaSemana)
    .order("hora_inicio");
  const slot06 = (horariosHoje ?? []).find((h) => h.hora_inicio.startsWith("06"));

  // 2. Alunos presenciais ativos da carteira (online não faz presença em aula).
  const { data: alunos } = await db
    .from("alunos")
    .select("id, nome")
    .eq("professor_id", prof.id)
    .eq("status", "ativo")
    .eq("tipo", "presencial")
    .order("nome");
  if (!alunos?.length) throw new Error("Professor não tem alunos presenciais ativos.");

  // 3. Atribui os alunos presenciais às aulas de hoje (vínculo aluno × horário).
  for (const h of horariosHoje ?? []) {
    await db.from("aluno_horarios").delete().eq("horario_id", h.id);
    await db
      .from("aluno_horarios")
      .insert(alunos.map((a) => ({ horario_id: h.id, aluno_id: a.id })));
  }
  console.log(`✓ Alunos atribuídos às aulas de hoje: ${alunos.length}.`);

  // 4. Recria as presenças de HOJE deste professor (idempotente).
  await db.from("presencas").delete().eq("professor_id", prof.id).eq("data", hojeISO);

  // Marca ~metade dos alunos presentes na aula das 06:00 (mock). O restante
  // fica para você marcar na tela.
  const horaPres = slot06 ? slot06.hora_inicio : "06:00";
  const presentes = alunos.slice(0, Math.ceil(alunos.length / 2));
  for (const a of presentes) {
    await db.from("presencas").insert({
      aluno_id: a.id,
      professor_id: prof.id,
      data: hojeISO,
      hora: horaPres,
    });
  }
  console.log(
    `✓ Presenças de hoje (${hojeISO}) na aula 06:00: ${presentes.length}/${alunos.length} aluno(s).`,
  );
  console.log("   Presentes:", presentes.map((a) => a.nome).join(", "));
  console.log("\n✅ Aulas de hoje prontas. Entre como professor e abra Presença.");
}

main().catch((e) => { console.error("\n✗ Erro:", e.message ?? e); process.exit(1); });
