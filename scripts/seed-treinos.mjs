import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

/**
 * Popula a biblioteca de exercícios (com mídia de demonstração) e monta uma
 * ficha de treino de exemplo para um aluno, para visualização. Usa a
 * service_role — rode só localmente. Idempotente: pode rodar mais de uma vez.
 *
 *   npm run seed:treinos [email-do-aluno]
 *
 * Sem argumento, tenta teste.aluno@studio.com, depois a aluna "Mariana",
 * depois o primeiro aluno cadastrado.
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRole) {
  console.error(
    "✗ Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// GIFs de demonstração (Wikimedia Commons, via Special:FilePath — estável).
const midia = (arquivo) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(arquivo)}`;

const EXERCICIOS = [
  { nome: "Agachamento livre", grupo_muscular: "Pernas", equipamento: "Barra", midia_url: midia("Squats.gif") },
  { nome: "Flexão de braço", grupo_muscular: "Peito", equipamento: "Peso corporal", midia_url: midia("Pushups.gif") },
  { nome: "Barra fixa", grupo_muscular: "Costas", equipamento: "Barra fixa", midia_url: midia("Pullup.gif") },
  { nome: "Levantamento terra", grupo_muscular: "Costas", equipamento: "Barra", midia_url: midia("Man_Lifting_Barbell_Deadlift_GIF_Animation_Loop.gif") },
  { nome: "Rosca bíceps", grupo_muscular: "Bíceps", equipamento: "Halteres", midia_url: midia("Lying-high-bench-biceps-curl-2.gif") },
  { nome: "Abdominal supra", grupo_muscular: "Abdômen", equipamento: "Peso corporal", midia_url: midia("Situps.gif") },
  { nome: "Burpee", grupo_muscular: "Cardio", equipamento: "Peso corporal", midia_url: midia("Burpees.gif") },
  { nome: "Polichinelo", grupo_muscular: "Cardio", equipamento: "Peso corporal", midia_url: midia("Jumpingjacks.gif") },
  { nome: "Elevação de joelhos", grupo_muscular: "Cardio", equipamento: "Peso corporal", midia_url: midia("High_knees.gif") },
  { nome: "Muscle-up", grupo_muscular: "Costas", equipamento: "Barra fixa", midia_url: midia("Muscle-up.gif") },
];

const FICHA_NOME = "Hipertrofia & Condicionamento";
const DIVISOES = [
  {
    nome: "A",
    foco: "Superior",
    dias_semana: [1, 4], // segunda e quinta
    exercicios: [
      { ex: "Flexão de braço", series: 3, repeticoes: "12", carga: null, descanso: "60s" },
      { ex: "Barra fixa", series: 4, repeticoes: "8", carga: null, descanso: "90s" },
      { ex: "Rosca bíceps", series: 3, repeticoes: "12", carga: "10 kg", descanso: "60s", observacao: "Sem balanço do tronco." },
    ],
  },
  {
    nome: "B",
    foco: "Inferior",
    dias_semana: [2, 5], // terça e sexta
    exercicios: [
      { ex: "Agachamento livre", series: 4, repeticoes: "10", carga: "40 kg", descanso: "90s", observacao: "Descer até paralela." },
      { ex: "Levantamento terra", series: 3, repeticoes: "8", carga: "60 kg", descanso: "120s" },
    ],
  },
  {
    nome: "C",
    foco: "Cardio & Core",
    dias_semana: [3, 6], // quarta e sábado
    exercicios: [
      { ex: "Burpee", series: 3, repeticoes: "15", carga: null, descanso: "45s" },
      { ex: "Polichinelo", series: 3, repeticoes: "40", carga: null, descanso: "30s" },
      { ex: "Abdominal supra", series: 3, repeticoes: "20", carga: null, descanso: "45s" },
    ],
  },
];

async function upsertExercicios() {
  const nomes = EXERCICIOS.map((e) => e.nome);
  const { data: existentes, error } = await supabase
    .from("exercicios")
    .select("id, nome")
    .in("nome", nomes);
  if (error) throw error;

  const mapa = new Map((existentes ?? []).map((e) => [e.nome, e.id]));

  // Atualiza mídia dos que já existem; insere os que faltam.
  for (const ex of EXERCICIOS) {
    if (mapa.has(ex.nome)) {
      const { error: e } = await supabase
        .from("exercicios")
        .update({
          grupo_muscular: ex.grupo_muscular,
          equipamento: ex.equipamento,
          midia_url: ex.midia_url,
        })
        .eq("id", mapa.get(ex.nome));
      if (e) throw e;
    }
  }

  const faltam = EXERCICIOS.filter((e) => !mapa.has(e.nome));
  if (faltam.length) {
    const { data: inseridos, error: e } = await supabase
      .from("exercicios")
      .insert(faltam)
      .select("id, nome");
    if (e) throw e;
    for (const r of inseridos ?? []) mapa.set(r.nome, r.id);
  }

  console.log(`✓ Biblioteca: ${mapa.size} exercícios prontos (com mídia).`);
  return mapa;
}

async function acharAluno(emailArg) {
  // 1) por e-mail do usuário
  const emails = [emailArg, "teste.aluno@studio.com"].filter(Boolean);
  for (const email of emails) {
    const { data: u } = await supabase
      .from("usuarios")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (u) {
      const { data: a } = await supabase
        .from("alunos")
        .select("id, nome")
        .eq("usuario_id", u.id)
        .maybeSingle();
      if (a) return a;
    }
  }
  // 2) por nome "Mariana"
  const { data: m } = await supabase
    .from("alunos")
    .select("id, nome")
    .ilike("nome", "%Mariana%")
    .limit(1)
    .maybeSingle();
  if (m) return m;
  // 3) primeiro aluno
  const { data: primeiro } = await supabase
    .from("alunos")
    .select("id, nome")
    .order("criado_em")
    .limit(1)
    .maybeSingle();
  return primeiro ?? null;
}

async function montarFicha(alunoId, mapaEx) {
  // Idempotência: remove a ficha de exemplo anterior (cascade nas divisões).
  await supabase
    .from("treinos")
    .delete()
    .eq("aluno_id", alunoId)
    .eq("nome", FICHA_NOME);

  const { data: treino, error: eT } = await supabase
    .from("treinos")
    .insert({
      aluno_id: alunoId,
      nome: FICHA_NOME,
      objetivo: "Ganho de massa e melhora do condicionamento — 3x por semana.",
      ativo: true,
    })
    .select("id")
    .single();
  if (eT) throw eT;

  let ordemDiv = 0;
  for (const div of DIVISOES) {
    const { data: divisao, error: eD } = await supabase
      .from("treino_divisoes")
      .insert({
        treino_id: treino.id,
        nome: div.nome,
        foco: div.foco,
        dias_semana: div.dias_semana ?? [],
        ordem: ordemDiv++,
      })
      .select("id")
      .single();
    if (eD) throw eD;

    const linhas = div.exercicios.map((item, i) => ({
      divisao_id: divisao.id,
      exercicio_id: mapaEx.get(item.ex),
      series: item.series ?? null,
      repeticoes: item.repeticoes ?? null,
      carga: item.carga ?? null,
      descanso: item.descanso ?? null,
      observacao: item.observacao ?? null,
      ordem: i,
    }));
    const { error: eE } = await supabase
      .from("treino_exercicios")
      .insert(linhas);
    if (eE) throw eE;
  }

  console.log(`✓ Ficha "${FICHA_NOME}" criada com ${DIVISOES.length} divisões.`);
}

async function main() {
  const emailArg = process.argv[2];
  const mapaEx = await upsertExercicios();

  const aluno = await acharAluno(emailArg);
  if (!aluno) {
    console.log("⚠ Nenhum aluno encontrado — só a biblioteca foi populada.");
    return;
  }

  await montarFicha(aluno.id, mapaEx);
  console.log(`✓ Atribuída ao aluno: ${aluno.nome} (${aluno.id})`);
}

main().catch((err) => {
  console.error("✗ Erro:", err.message ?? err);
  process.exit(1);
});
