import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

/**
 * Enriquece a biblioteca de exercícios (nomes/descrições em pt-BR) com
 * imagens do free-exercise-db (domínio público, estilo visual consistente)
 * e cria treinos-modelo prontos para aplicar aos alunos.
 *
 *   npm run seed:biblioteca
 *
 * Usa a service_role — rode só localmente. Idempotente.
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

// ---------------------------------------------------------------------------
// Fonte das imagens: free-exercise-db (licença livre, ilustrações no mesmo
// estilo). O índice traz id, nome em inglês e os caminhos das imagens.
// ---------------------------------------------------------------------------
const DB_JSON =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const IMG_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

// Lista curada: nome pt-BR + nome em inglês no free-exercise-db.
// (grupo, equipamento e descrição em português, como manda o domínio.)
const EXERCICIOS = [
  // — Peito
  { nome: "Supino reto com barra", en: "Barbell Bench Press - Medium Grip", grupo: "Peito", equip: "Barra", desc: "Deite no banco, desça a barra até o peito e empurre. Escápulas retraídas." },
  { nome: "Supino inclinado com halteres", en: "Incline Dumbbell Press", grupo: "Peito", equip: "Halteres", desc: "Banco a 30–45°. Desça controlando até a linha do peito." },
  { nome: "Supino declinado com barra", en: "Decline Barbell Bench Press", grupo: "Peito", equip: "Barra", desc: "Ênfase na porção inferior do peitoral." },
  { nome: "Crucifixo com halteres", en: "Dumbbell Flyes", grupo: "Peito", equip: "Halteres", desc: "Braços semiflexionados, abra até sentir alongar o peitoral." },
  { nome: "Cross-over na polia", en: "Cable Crossover", grupo: "Peito", equip: "Polia", desc: "Cruze os cabos à frente do corpo, contraindo o peitoral." },
  { nome: "Flexão de braço", en: "Pushups", grupo: "Peito", equip: "Peso corporal", desc: "Corpo alinhado, desça até quase tocar o chão." },
  { nome: "Supino na máquina", en: "Machine Bench Press", grupo: "Peito", equip: "Máquina", desc: "Boa opção para iniciantes: trajetória guiada." },
  { nome: "Voador (peck deck)", en: "Butterfly", grupo: "Peito", equip: "Máquina", desc: "Cotovelos na altura dos ombros, feche contraindo o peito." },
  { nome: "Pullover com halter", en: "Bent-Arm Dumbbell Pullover", grupo: "Peito", equip: "Halteres", desc: "Deitado, leve o halter atrás da cabeça e retorne." },

  // — Costas
  { nome: "Barra fixa", en: "Pullups", grupo: "Costas", equip: "Barra fixa", desc: "Pegada pronada, puxe até o queixo passar a barra." },
  { nome: "Puxada alta (pulley)", en: "Wide-Grip Lat Pulldown", grupo: "Costas", equip: "Polia", desc: "Puxe a barra até a parte superior do peito, tronco firme." },
  { nome: "Puxada fechada (triângulo)", en: "Close-Grip Front Lat Pulldown", grupo: "Costas", equip: "Polia", desc: "Pegada fechada, cotovelos junto ao corpo." },
  { nome: "Remada curvada com barra", en: "Bent Over Barbell Row", grupo: "Costas", equip: "Barra", desc: "Tronco inclinado, puxe a barra ao abdômen. Coluna neutra." },
  { nome: "Remada sentada na polia", en: "Seated Cable Rows", grupo: "Costas", equip: "Polia", desc: "Puxe o triângulo ao abdômen sem balançar o tronco." },
  { nome: "Remada unilateral com halter", en: "One-Arm Dumbbell Row", grupo: "Costas", equip: "Halteres", desc: "Apoie no banco, puxe o halter junto ao corpo." },
  { nome: "Levantamento terra", en: "Barbell Deadlift", grupo: "Costas", equip: "Barra", desc: "Quadril para trás, coluna neutra, empurre o chão." },
  { nome: "Pull-down braços estendidos", en: "Straight-Arm Pulldown", grupo: "Costas", equip: "Polia", desc: "Braços quase estendidos, leve a barra até a coxa." },
  { nome: "Encolhimento com barra", en: "Barbell Shrug", grupo: "Costas", equip: "Barra", desc: "Eleve os ombros em direção às orelhas (trapézio)." },
  { nome: "Extensão lombar (banco romano)", en: "Hyperextensions (Back Extensions)", grupo: "Costas", equip: "Peso corporal", desc: "Suba até alinhar o tronco, sem hiperestender." },

  // — Pernas (quadríceps)
  { nome: "Agachamento livre", en: "Barbell Squat", grupo: "Pernas", equip: "Barra", desc: "Pés na largura dos ombros, desça até a paralela." },
  { nome: "Agachamento frontal", en: "Front Barbell Squat", grupo: "Pernas", equip: "Barra", desc: "Barra à frente, tronco mais ereto, com ênfase no quadríceps." },
  { nome: "Agachamento corpo livre", en: "Bodyweight Squat", grupo: "Pernas", equip: "Peso corporal", desc: "Base para aprender o padrão do agachamento." },
  { nome: "Agachamento no Smith", en: "Smith Machine Squat", grupo: "Pernas", equip: "Máquina", desc: "Trajetória guiada, boa para aprender ou variar." },
  { nome: "Agachamento búlgaro", en: "One Leg Barbell Squat", grupo: "Pernas", equip: "Barra", desc: "Pé de trás elevado no banco, desça na perna da frente." },
  { nome: "Leg press", en: "Leg Press", grupo: "Pernas", equip: "Máquina", desc: "Desça controlando até ~90° sem tirar o quadril do banco." },
  { nome: "Afundo com barra", en: "Barbell Lunge", grupo: "Pernas", equip: "Barra", desc: "Passo à frente, joelho de trás em direção ao chão." },
  { nome: "Passada (walking lunge)", en: "Bodyweight Walking Lunge", grupo: "Pernas", equip: "Peso corporal", desc: "Afundos alternados caminhando." },
  { nome: "Cadeira extensora", en: "Leg Extensions", grupo: "Pernas", equip: "Máquina", desc: "Estenda os joelhos e segure 1s no topo." },

  // — Posterior & Glúteos
  { nome: "Stiff com barra", en: "Stiff-Legged Barbell Deadlift", grupo: "Posterior", equip: "Barra", desc: "Pernas quase estendidas, desça a barra alongando o posterior." },
  { nome: "Terra romeno", en: "Romanian Deadlift", grupo: "Posterior", equip: "Barra", desc: "Quadril para trás, barra rente às pernas." },
  { nome: "Terra sumô", en: "Sumo Deadlift", grupo: "Posterior", equip: "Barra", desc: "Base larga, pontas dos pés para fora." },
  { nome: "Mesa flexora", en: "Lying Leg Curls", grupo: "Posterior", equip: "Máquina", desc: "Flexione os joelhos sem tirar o quadril do banco." },
  { nome: "Cadeira flexora", en: "Seated Leg Curl", grupo: "Posterior", equip: "Máquina", desc: "Versão sentada da flexão de joelhos." },
  { nome: "Bom-dia", en: "Good Morning", grupo: "Posterior", equip: "Barra", desc: "Incline o tronco com a barra nas costas, coluna neutra." },
  { nome: "Elevação pélvica com barra", en: "Barbell Glute Bridge", grupo: "Glúteos", equip: "Barra", desc: "Empurre o quadril para cima e contraia o glúteo no topo." },
  { nome: "Coice na polia (glúteo)", en: "Glute Kickback", grupo: "Glúteos", equip: "Polia", desc: "Estenda o quadril para trás com controle." },

  // — Panturrilha
  { nome: "Panturrilha em pé", en: "Standing Calf Raises", grupo: "Panturrilha", equip: "Máquina", desc: "Suba na ponta dos pés, pausa no topo, desça alongando." },
  { nome: "Panturrilha sentado", en: "Seated Calf Raise", grupo: "Panturrilha", equip: "Máquina", desc: "Ênfase no sóleo." },
  { nome: "Panturrilha no leg press", en: "Calf Press On The Leg-Press Machine", grupo: "Panturrilha", equip: "Máquina", desc: "Empurre a plataforma só com a ponta dos pés." },

  // — Ombros
  { nome: "Desenvolvimento com barra", en: "Barbell Shoulder Press", grupo: "Ombros", equip: "Barra", desc: "Empurre a barra acima da cabeça sem arquear a lombar." },
  { nome: "Desenvolvimento com halteres", en: "Dumbbell Shoulder Press", grupo: "Ombros", equip: "Halteres", desc: "Suba os halteres até estender os cotovelos." },
  { nome: "Desenvolvimento Arnold", en: "Arnold Dumbbell Press", grupo: "Ombros", equip: "Halteres", desc: "Gire os punhos durante a subida." },
  { nome: "Elevação lateral", en: "Side Lateral Raise", grupo: "Ombros", equip: "Halteres", desc: "Eleve até a linha dos ombros, cotovelos levemente flexionados." },
  { nome: "Elevação frontal", en: "Front Dumbbell Raise", grupo: "Ombros", equip: "Halteres", desc: "Eleve à frente até a altura dos ombros." },
  { nome: "Crucifixo inverso", en: "Reverse Flyes", grupo: "Ombros", equip: "Halteres", desc: "Tronco inclinado, abra os braços; posterior de ombro." },
  { nome: "Remada alta", en: "Upright Barbell Row", grupo: "Ombros", equip: "Barra", desc: "Puxe a barra até a linha do peito, cotovelos altos." },

  // — Bíceps
  { nome: "Rosca direta com barra", en: "Barbell Curl", grupo: "Bíceps", equip: "Barra", desc: "Cotovelos fixos ao lado do corpo, sem balanço." },
  { nome: "Rosca alternada com halteres", en: "Dumbbell Alternate Bicep Curl", grupo: "Bíceps", equip: "Halteres", desc: "Alterne os braços, girando o punho na subida." },
  { nome: "Rosca martelo", en: "Hammer Curls", grupo: "Bíceps", equip: "Halteres", desc: "Pegada neutra, trabalha também o antebraço." },
  { nome: "Rosca Scott", en: "Preacher Curl", grupo: "Bíceps", equip: "Barra W", desc: "Braços apoiados no banco Scott, amplitude completa." },
  { nome: "Rosca concentrada", en: "Concentration Curls", grupo: "Bíceps", equip: "Halteres", desc: "Cotovelo apoiado na coxa, suba com controle." },
  { nome: "Rosca na polia", en: "Standing Biceps Cable Curl", grupo: "Bíceps", equip: "Polia", desc: "Tensão contínua durante todo o movimento." },

  // — Tríceps
  { nome: "Tríceps na polia (barra)", en: "Triceps Pushdown", grupo: "Tríceps", equip: "Polia", desc: "Cotovelos fixos, estenda até o final." },
  { nome: "Tríceps corda", en: "Triceps Pushdown - Rope Attachment", grupo: "Tríceps", equip: "Polia", desc: "Abra a corda no final do movimento." },
  { nome: "Tríceps testa", en: "Lying Triceps Press", grupo: "Tríceps", equip: "Barra W", desc: "Deitado, desça a barra até a testa flexionando só os cotovelos." },
  { nome: "Supino fechado", en: "Close-Grip Barbell Bench Press", grupo: "Tríceps", equip: "Barra", desc: "Pegada fechada, cotovelos junto ao corpo." },
  { nome: "Tríceps francês", en: "Standing Dumbbell Triceps Extension", grupo: "Tríceps", equip: "Halteres", desc: "Halter atrás da cabeça, estenda os cotovelos." },
  { nome: "Mergulho no banco", en: "Bench Dips", grupo: "Tríceps", equip: "Peso corporal", desc: "Mãos no banco atrás do corpo, desça flexionando os cotovelos." },
  { nome: "Paralelas (tríceps)", en: "Dips - Triceps Version", grupo: "Tríceps", equip: "Paralelas", desc: "Tronco ereto para focar o tríceps." },

  // — Abdômen & Core
  { nome: "Abdominal supra", en: "Crunches", grupo: "Abdômen", equip: "Peso corporal", desc: "Suba o tronco contraindo o abdômen, sem puxar o pescoço." },
  { nome: "Abdominal infra", en: "Reverse Crunch", grupo: "Abdômen", equip: "Peso corporal", desc: "Traga os joelhos ao peito elevando o quadril." },
  { nome: "Abdominal bicicleta", en: "Air Bike", grupo: "Abdômen", equip: "Peso corporal", desc: "Cotovelo em direção ao joelho oposto, alternando." },
  { nome: "Prancha", en: "Plank", grupo: "Abdômen", equip: "Peso corporal", desc: "Corpo alinhado, abdômen contraído. Segure o tempo indicado." },
  { nome: "Prancha lateral", en: "Side Bridge", grupo: "Abdômen", equip: "Peso corporal", desc: "Apoio no antebraço, quadril elevado e alinhado." },
  { nome: "Rotação russa", en: "Russian Twist", grupo: "Abdômen", equip: "Peso corporal", desc: "Sentado, gire o tronco de um lado ao outro." },
  { nome: "Elevação de pernas suspenso", en: "Hanging Leg Raise", grupo: "Abdômen", equip: "Barra fixa", desc: "Pendurado, eleve as pernas sem balançar." },
  { nome: "Elevação de pernas no banco", en: "Flat Bench Lying Leg Raise", grupo: "Abdômen", equip: "Peso corporal", desc: "Deitado, eleve as pernas estendidas com controle." },
  { nome: "Mountain climber", en: "Mountain Climbers", grupo: "Abdômen", equip: "Peso corporal", desc: "Em prancha, alterne os joelhos ao peito em ritmo acelerado." },
  { nome: "Superman", en: "Superman", grupo: "Abdômen", equip: "Peso corporal", desc: "De bruços, eleve braços e pernas ao mesmo tempo." },

  // — Condicionamento
  { nome: "Pular corda", en: "Rope Jumping", grupo: "Cardio", equip: "Corda", desc: "Saltos curtos, aterrissagem leve na ponta dos pés." },
  { nome: "Remo ergômetro", en: "Rowing, Stationary", grupo: "Cardio", equip: "Máquina", desc: "Pernas → tronco → braços; retorne na ordem inversa." },
  { nome: "Bicicleta ergométrica", en: "Bicycling, Stationary", grupo: "Cardio", equip: "Máquina", desc: "Cadência constante; ajuste a carga ao objetivo." },
  { nome: "Corrida na esteira", en: "Running, Treadmill", grupo: "Cardio", equip: "Máquina", desc: "Aquecimento ou cardio contínuo/intervalado." },
];

// ---------------------------------------------------------------------------
// Treinos-modelo (reutilizáveis) — nomes dos exercícios em pt-BR acima.
// ---------------------------------------------------------------------------
const MODELOS = [
  {
    nome: "Full Body · Iniciante",
    objetivo: "Adaptação e condicionamento geral: 2 a 3x por semana.",
    divisoes: [
      {
        nome: "A", foco: "Corpo inteiro I", dias: [1, 5],
        exercicios: [
          { ex: "Agachamento corpo livre", series: 3, reps: "12-15", desc: "60s" },
          { ex: "Supino na máquina", series: 3, reps: "12", desc: "60s" },
          { ex: "Remada sentada na polia", series: 3, reps: "12", desc: "60s" },
          { ex: "Desenvolvimento com halteres", series: 3, reps: "10-12", desc: "60s" },
          { ex: "Prancha", series: 3, reps: "30s", desc: "45s" },
        ],
      },
      {
        nome: "B", foco: "Corpo inteiro II", dias: [3],
        exercicios: [
          { ex: "Leg press", series: 3, reps: "12", desc: "60s" },
          { ex: "Puxada alta (pulley)", series: 3, reps: "12", desc: "60s" },
          { ex: "Flexão de braço", series: 3, reps: "10-12", desc: "60s" },
          { ex: "Elevação lateral", series: 3, reps: "12-15", desc: "45s" },
          { ex: "Abdominal supra", series: 3, reps: "15-20", desc: "45s" },
        ],
      },
    ],
  },
  {
    nome: "Hipertrofia ABC · Intermediário",
    objetivo: "Ganho de massa muscular: 3 a 5x por semana.",
    divisoes: [
      {
        nome: "A", foco: "Peito & Tríceps", dias: [1],
        exercicios: [
          { ex: "Supino reto com barra", series: 4, reps: "8-10", desc: "90s" },
          { ex: "Supino inclinado com halteres", series: 3, reps: "10", desc: "90s" },
          { ex: "Crucifixo com halteres", series: 3, reps: "12", desc: "60s" },
          { ex: "Cross-over na polia", series: 3, reps: "12-15", desc: "60s" },
          { ex: "Tríceps testa", series: 3, reps: "10", desc: "60s" },
          { ex: "Tríceps corda", series: 3, reps: "12", desc: "60s" },
        ],
      },
      {
        nome: "B", foco: "Costas & Bíceps", dias: [3],
        exercicios: [
          { ex: "Barra fixa", series: 4, reps: "máx.", desc: "90s" },
          { ex: "Remada curvada com barra", series: 4, reps: "8-10", desc: "90s" },
          { ex: "Puxada alta (pulley)", series: 3, reps: "10-12", desc: "60s" },
          { ex: "Remada unilateral com halter", series: 3, reps: "10", desc: "60s" },
          { ex: "Rosca direta com barra", series: 3, reps: "10", desc: "60s" },
          { ex: "Rosca martelo", series: 3, reps: "12", desc: "60s" },
        ],
      },
      {
        nome: "C", foco: "Pernas & Ombros", dias: [5],
        exercicios: [
          { ex: "Agachamento livre", series: 4, reps: "8-10", desc: "120s" },
          { ex: "Leg press", series: 4, reps: "10-12", desc: "90s" },
          { ex: "Cadeira extensora", series: 3, reps: "12-15", desc: "60s" },
          { ex: "Mesa flexora", series: 3, reps: "12", desc: "60s" },
          { ex: "Panturrilha em pé", series: 4, reps: "15", desc: "45s" },
          { ex: "Desenvolvimento com barra", series: 4, reps: "10", desc: "90s" },
          { ex: "Elevação lateral", series: 3, reps: "12-15", desc: "45s" },
        ],
      },
    ],
  },
  {
    nome: "Inferior & Glúteos · Foco",
    objetivo: "Ênfase em pernas e glúteos: 2x por semana.",
    divisoes: [
      {
        nome: "A", foco: "Quadríceps", dias: [2],
        exercicios: [
          { ex: "Agachamento livre", series: 4, reps: "10", desc: "90s" },
          { ex: "Leg press", series: 4, reps: "12", desc: "90s" },
          { ex: "Afundo com barra", series: 3, reps: "10 (cada)", desc: "60s" },
          { ex: "Cadeira extensora", series: 3, reps: "15", desc: "60s" },
          { ex: "Panturrilha em pé", series: 4, reps: "15", desc: "45s" },
        ],
      },
      {
        nome: "B", foco: "Posterior & Glúteos", dias: [5],
        exercicios: [
          { ex: "Stiff com barra", series: 4, reps: "10", desc: "90s" },
          { ex: "Mesa flexora", series: 4, reps: "12", desc: "60s" },
          { ex: "Elevação pélvica com barra", series: 4, reps: "12", desc: "90s" },
          { ex: "Bom-dia", series: 3, reps: "10", desc: "60s" },
          { ex: "Panturrilha sentado", series: 4, reps: "15", desc: "45s" },
        ],
      },
    ],
  },
  {
    nome: "Condicionamento · Circuito",
    objetivo: "Emagrecimento e resistência: circuito com pouco descanso, 3x por semana.",
    divisoes: [
      {
        nome: "A", foco: "Circuito corpo inteiro", dias: [2, 4, 6],
        exercicios: [
          { ex: "Agachamento corpo livre", series: 3, reps: "15", desc: "30s" },
          { ex: "Flexão de braço", series: 3, reps: "12", desc: "30s" },
          { ex: "Remada sentada na polia", series: 3, reps: "15", desc: "30s" },
          { ex: "Mountain climber", series: 3, reps: "30s", desc: "30s" },
          { ex: "Prancha", series: 3, reps: "40s", desc: "30s" },
          { ex: "Pular corda", series: 3, reps: "1 min", desc: "45s" },
          { ex: "Abdominal bicicleta", series: 3, reps: "20", desc: "30s" },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

async function carregarIndiceImagens() {
  const res = await fetch(DB_JSON);
  if (!res.ok) throw new Error(`Falha ao baixar o índice de imagens (${res.status}).`);
  const lista = await res.json();
  const porNome = new Map(lista.map((e) => [norm(e.name), e]));
  return { lista, porNome };
}

function resolverImagem(indice, en) {
  const alvo = norm(en);
  let hit = indice.porNome.get(alvo);
  if (!hit) {
    hit = indice.lista.find(
      (e) => norm(e.name).includes(alvo) || alvo.includes(norm(e.name)),
    );
  }
  if (!hit || !hit.images?.length) return null;
  return `${IMG_BASE}${encodeURI(hit.images[0])}`;
}

async function upsertExercicios(indice) {
  const { data: existentes, error } = await supabase
    .from("exercicios")
    .select("id, nome");
  if (error) throw error;
  const mapa = new Map((existentes ?? []).map((e) => [e.nome, e.id]));

  let comImagem = 0;
  const semImagem = [];

  for (const ex of EXERCICIOS) {
    const midia_url = resolverImagem(indice, ex.en);
    if (midia_url) comImagem++;
    else semImagem.push(`${ex.nome} (${ex.en})`);

    const linha = {
      nome: ex.nome,
      grupo_muscular: ex.grupo,
      equipamento: ex.equip,
      descricao: ex.desc,
      midia_url,
    };

    if (mapa.has(ex.nome)) {
      const { error: e } = await supabase
        .from("exercicios")
        .update(linha)
        .eq("id", mapa.get(ex.nome));
      if (e) throw e;
    } else {
      const { data: ins, error: e } = await supabase
        .from("exercicios")
        .insert(linha)
        .select("id")
        .single();
      if (e) throw e;
      mapa.set(ex.nome, ins.id);
    }
  }

  console.log(
    `✓ Biblioteca: ${EXERCICIOS.length} exercícios (${comImagem} com imagem).`,
  );
  if (semImagem.length) {
    console.log(`⚠ Sem imagem correspondente:\n   - ${semImagem.join("\n   - ")}`);
  }
  return mapa;
}

async function criarModelos(mapaEx) {
  for (const modelo of MODELOS) {
    // Idempotência: recria o modelo do zero (cascade nas divisões).
    await supabase
      .from("treinos")
      .delete()
      .eq("modelo", true)
      .eq("nome", modelo.nome);

    const { data: treino, error: eT } = await supabase
      .from("treinos")
      .insert({
        aluno_id: null,
        professor_id: null,
        nome: modelo.nome,
        objetivo: modelo.objetivo,
        ativo: true,
        modelo: true,
      })
      .select("id")
      .single();
    if (eT) throw eT;

    let ordemDiv = 0;
    for (const div of modelo.divisoes) {
      const { data: divisao, error: eD } = await supabase
        .from("treino_divisoes")
        .insert({
          treino_id: treino.id,
          nome: div.nome,
          foco: div.foco,
          dias_semana: div.dias ?? [],
          ordem: ordemDiv++,
        })
        .select("id")
        .single();
      if (eD) throw eD;

      const linhas = div.exercicios
        .map((item, i) => {
          const exercicioId = mapaEx.get(item.ex);
          if (!exercicioId) {
            console.log(`⚠ "${item.ex}" não está na biblioteca — pulado em ${modelo.nome}/${div.nome}.`);
            return null;
          }
          return {
            divisao_id: divisao.id,
            exercicio_id: exercicioId,
            series: item.series ?? null,
            repeticoes: item.reps ?? null,
            descanso: item.desc ?? null,
            observacao: item.obs ?? null,
            ordem: i,
          };
        })
        .filter(Boolean);

      if (linhas.length) {
        const { error: eE } = await supabase
          .from("treino_exercicios")
          .insert(linhas);
        if (eE) throw eE;
      }
    }

    const nEx = modelo.divisoes.reduce((s, d) => s + d.exercicios.length, 0);
    console.log(
      `✓ Modelo "${modelo.nome}": ${modelo.divisoes.length} divisão(ões), ${nEx} exercício(s).`,
    );
  }
}

async function main() {
  console.log("→ Baixando índice de imagens (free-exercise-db)…");
  const indice = await carregarIndiceImagens();
  const mapaEx = await upsertExercicios(indice);
  await criarModelos(mapaEx);
  console.log("✓ Concluído.");
}

main().catch((err) => {
  console.error("✗ Erro:", err.message ?? err);
  process.exit(1);
});
