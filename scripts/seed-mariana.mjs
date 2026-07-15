import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

/**
 * Seed de DEMONSTRAÇÃO da Mariana (login teste.aluno@studio.com): monta um
 * cenário completo e coerente para apresentar a área do aluno.
 *
 *   npm run seed:mariana
 *
 * O que cria (idempotente, limpa e recria os dados DELA):
 *  - cadastro completo (telefone, e-mail, nascimento) + anamnese
 *  - matrícula ativa: 4 mensalidades pagas + mês atual EM ABERTO (demonstra
 *    o alerta na área da aluna e a baixa do pagamento na área do dono)
 *  - agenda seg/qua/sex 18h com o professor dela
 *  - ficha ativa A/B/C casada com a agenda, com cargas e mídia da biblioteca
 *  - avaliações mensais (peso/%gordura/medidas) para o gráfico de evolução
 *  - presenças das últimas 8 semanas só em dia de aula (frequência boa)
 *  - 3 treinos concluídos no app (execuções) para o retorno do professor
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
const hoje = new Date();
const primeiroDoMes = (n = 0) => ISO(new Date(hoje.getFullYear(), hoje.getMonth() + n, 1));
const diasAtras = (n) => new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - n);

async function main() {
  // ---------------- REFERÊNCIAS ----------------
  const { data: usuario } = await db.from("usuarios").select("id").eq("email", "teste.aluno@studio.com").single();
  if (!usuario) throw new Error("Usuário teste.aluno@studio.com não encontrado.");
  const { data: aluna } = await db.from("alunos").select("id, professor_id").eq("usuario_id", usuario.id).single();
  if (!aluna) throw new Error("Aluna da conta teste.aluno não encontrada.");
  if (!aluna.professor_id) throw new Error("Aluna sem professor atribuído.");
  const profId = aluna.professor_id;

  // ---------------- CADASTRO ----------------
  await db.from("alunos").update({
    tipo: "presencial",
    status: "ativo",
    telefone: "(47) 99988-7766",
    email: "teste.aluno@studio.com",
    data_nascimento: "1992-03-14",
  }).eq("id", aluna.id);
  console.log("✓ Cadastro completo");

  // ---------------- LIMPEZA (só dados da Mariana) ----------------
  await db.from("treino_execucoes").delete().eq("aluno_id", aluna.id);
  await db.from("presencas").delete().eq("aluno_id", aluna.id);
  await db.from("aluno_horarios").delete().eq("aluno_id", aluna.id);
  await db.from("treinos").delete().eq("aluno_id", aluna.id); // cascade divisões/exercícios
  await db.from("anamneses").delete().eq("aluno_id", aluna.id);
  await db.from("avaliacoes_fisicas").delete().eq("aluno_id", aluna.id);
  await db.from("pagamentos").delete().eq("aluno_id", aluna.id);
  await db.from("matriculas").delete().eq("aluno_id", aluna.id);

  // ---------------- ANAMNESE ----------------
  await db.from("anamneses").insert({
    aluno_id: aluna.id,
    objetivos: "Emagrecimento com ganho de tônus muscular. Meta: 70 kg até o fim do ano.",
    historico_saude: "Sem comorbidades. Exames em dia.",
    lesoes_restricoes: "Condropatia patelar leve no joelho direito: evitar impacto excessivo e agachamento profundo com carga alta.",
    medicacao: "Nenhuma.",
    rotina_disponibilidade: "Segunda, quarta e sexta às 18h. Trabalha sentada o dia todo.",
    nivel_atividade: "Moderado",
    criado_por: profId,
  });
  console.log("✓ Anamnese");

  // ---------------- AVALIAÇÕES (5 meses, evolução visível) ----------------
  const serie = [
    { peso: 76.0, pg: 26.0, cintura: 78, quadril: 104, braco: 29.0, coxa: 60.0, peitoral: 94 },
    { peso: 74.2, pg: 24.8, cintura: 76, quadril: 103, braco: 29.4, coxa: 59.2, peitoral: 93 },
    { peso: 72.8, pg: 23.6, cintura: 74, quadril: 102, braco: 29.8, coxa: 58.6, peitoral: 92 },
    { peso: 71.5, pg: 22.4, cintura: 73, quadril: 101, braco: 30.1, coxa: 58.0, peitoral: 92 },
    { peso: 70.4, pg: 21.3, cintura: 71, quadril: 100, braco: 30.5, coxa: 57.5, peitoral: 91 },
  ];
  for (let i = 0; i < serie.length; i++) {
    const p = serie[i];
    await db.from("avaliacoes_fisicas").insert({
      aluno_id: aluna.id,
      data: primeiroDoMes(-(serie.length - 1 - i)),
      peso: p.peso,
      altura: 1.68,
      percentual_gordura: p.pg,
      medidas: { cintura: p.cintura, quadril: p.quadril, braco: p.braco, coxa: p.coxa, peitoral: p.peitoral },
      observacoes: i === serie.length - 1 ? "Quase na meta de 70 kg. Adesão excelente, seguimos!" : null,
      criado_por: profId,
    });
  }
  console.log(`✓ Avaliações: ${serie.length}`);

  // ---------------- MATRÍCULA + PAGAMENTOS (tudo em dia) ----------------
  const { data: plano } = await db.from("planos").select("id, valor").eq("nome", "Mensal Presencial").maybeSingle();
  if (!plano) throw new Error("Plano 'Mensal Presencial' não encontrado (rode npm run seed:demo antes).");
  const { data: mat } = await db.from("matriculas").insert({
    aluno_id: aluna.id,
    plano_id: plano.id,
    data_inicio: primeiroDoMes(-4),
    data_proxima_cobranca: primeiroDoMes(1),
    renovacao_automatica: true,
    status: "ativa",
  }).select("id").single();
  // Meses anteriores pagos; o mês ATUAL fica EM ABERTO (pendente, vencendo em
  // alguns dias) para demonstrar o fluxo: alerta na área da aluna e baixa do
  // pagamento na área do dono.
  const formas = ["PIX", "PIX", "Cartão", "PIX"];
  for (let m = 4; m >= 0; m--) {
    const comp = primeiroDoMes(-m);
    const atual = m === 0;
    const pag = new Date(`${comp}T00:00:00`);
    pag.setDate(3); // pagava sempre no dia 3
    await db.from("pagamentos").insert({
      matricula_id: mat.id,
      aluno_id: aluna.id,
      competencia: comp,
      valor: plano.valor,
      vencimento: atual ? ISO(diasAtras(-5)) : comp, // atual vence daqui a 5 dias
      data_pagamento: atual ? null : ISO(pag),
      status: atual ? "pendente" : "pago",
      forma_pagamento: atual ? null : formas[m - 1],
    });
  }
  console.log("✓ Matrícula ativa + 4 pagas + mês atual EM ABERTO (vence em 5 dias)");

  // ---------------- AGENDA (aulas 18h de seg/qua/sex do professor dela) ----------------
  const { data: horsData } = await db
    .from("horarios")
    .select("id, dia_semana, hora_inicio")
    .eq("professor_id", profId);
  const aulas18 = (horsData ?? []).filter(
    (h) => [1, 3, 5].includes(h.dia_semana) && String(h.hora_inicio).startsWith("18"),
  );
  if (aulas18.length === 0) throw new Error("Professor sem aulas 18h seg/qua/sex (rode npm run seed:demo antes).");
  for (const h of aulas18) {
    await db.from("aluno_horarios").insert({ aluno_id: aluna.id, horario_id: h.id });
  }
  console.log(`✓ Agenda: ${aulas18.length} aula(s) por semana (18h)`);

  // ---------------- FICHA DE TREINO (A/B/C casada com a agenda) ----------------
  const { data: exs } = await db.from("exercicios").select("id, nome");
  const exId = (n) => exs.find((e) => e.nome === n)?.id;

  const { data: treino } = await db.from("treinos").insert({
    aluno_id: aluna.id,
    professor_id: profId,
    nome: "Projeto Verão",
    objetivo: "Reduzir percentual de gordura e fortalecer membros inferiores, preservando o joelho direito.",
    ativo: true,
  }).select("id").single();

  const divisoes = [
    {
      nome: "A", foco: "Inferior e glúteos", dias_semana: [1],
      exs: [
        ["Agachamento livre", 4, "12", "20 kg", "60s"],
        ["Leg press", 4, "12", "80 kg", "60s"],
        ["Cadeira extensora", 3, "15", "25 kg", "45s"],
        ["Elevação pélvica com barra", 4, "12", "30 kg", "60s"],
        ["Panturrilha em pé", 4, "15", "corpo", "30s"],
      ],
    },
    {
      nome: "B", foco: "Superior e core", dias_semana: [3],
      exs: [
        ["Supino na máquina", 4, "12", "15 kg", "60s"],
        ["Puxada alta (pulley)", 4, "12", "30 kg", "60s"],
        ["Remada sentada na polia", 3, "12", "27 kg", "60s"],
        ["Elevação lateral", 3, "15", "4 kg", "45s"],
        ["Prancha", 3, "40s", "corpo", "30s"],
        ["Abdominal supra", 3, "20", "corpo", "30s"],
      ],
    },
    {
      nome: "C", foco: "Full body e cardio", dias_semana: [5],
      exs: [
        ["Terra romeno", 4, "10", "25 kg", "60s"],
        ["Passada (walking lunge)", 3, "12", "10 kg", "60s"],
        ["Desenvolvimento com halteres", 3, "12", "8 kg", "60s"],
        ["Rosca direta com barra", 3, "12", "12 kg", "45s"],
        ["Tríceps corda", 3, "12", "15 kg", "45s"],
        ["Bicicleta ergométrica", 1, "15 min", "leve", "0"],
      ],
    },
  ];

  const divisaoIdPorDia = new Map(); // dia_semana -> {id, nome, foco, exs}
  let ordemDiv = 0;
  for (const d of divisoes) {
    const { data: div } = await db.from("treino_divisoes").insert({
      treino_id: treino.id, nome: d.nome, foco: d.foco, dias_semana: d.dias_semana, ordem: ordemDiv++,
    }).select("id").single();
    divisaoIdPorDia.set(d.dias_semana[0], { id: div.id, ...d });
    let ordemEx = 0;
    let pulados = 0;
    for (const [nome, series, reps, carga, descanso] of d.exs) {
      if (!exId(nome)) { pulados++; continue; }
      await db.from("treino_exercicios").insert({
        divisao_id: div.id, exercicio_id: exId(nome), series, repeticoes: reps, carga, descanso, ordem: ordemEx++,
      });
    }
    if (pulados) console.log(`  (divisão ${d.nome}: ${pulados} exercício(s) não achado(s) na biblioteca)`);
  }
  console.log("✓ Ficha ativa: Projeto Verão (A seg · B qua · C sex)");

  // ---------------- PRESENÇAS + EXECUÇÕES (últimas 8 semanas, só dia de aula) ----------------
  // Os 3 dias de aula mais recentes viram treinos concluídos no app (execução,
  // aparece no retorno do professor); o resto vira presença, com faltas
  // ocasionais para a frequência ficar realista (~85%).
  let nPres = 0;
  let nExec = 0;
  let idx = 0;
  for (let d = 1; d <= 56; d++) {
    const dt = diasAtras(d);
    if (![1, 3, 5].includes(dt.getDay())) continue;
    const dia = ISO(dt);
    idx++;
    if (idx <= 3) {
      // Execução no app, coerente com a divisão do dia.
      const div = divisaoIdPorDia.get(dt.getDay());
      const feitos = div.exs.length - (idx === 3 ? 1 : 0); // uma vez não deu tempo de tudo
      const sensacoes = ["na_medida", "dificil", "na_medida"];
      const obs = [
        "Aumentei a carga no leg press! Joelho sem dor.",
        "Treino pesado hoje, mas concluído. Prancha ficou mais fácil.",
        null,
      ];
      await db.from("treino_execucoes").insert({
        aluno_id: aluna.id,
        divisao_id: div.id,
        nome_divisao: div.nome,
        foco_divisao: div.foco,
        iniciado_em: `${dia}T18:04:00-03:00`,
        finalizado_em: `${dia}T18:52:00-03:00`,
        duracao_segundos: 48 * 60,
        exercicios_previstos: div.exs.length,
        exercicios_feitos: feitos,
        detalhes: div.exs.map(([nome, series, , carga], i2) => ({
          nome, series, series_feitas: i2 < feitos ? series : 0, carga,
        })),
        sensacao: sensacoes[idx - 1],
        observacao: obs[idx - 1],
      });
      nExec++;
      continue;
    }
    if (idx % 8 === 0) continue; // falta ocasional
    await db.from("presencas").insert({
      aluno_id: aluna.id, professor_id: profId, data: dia, hora: "18:00",
    });
    nPres++;
  }
  console.log(`✓ Presenças: ${nPres} · Treinos no app: ${nExec}`);

  console.log("\n✅ Mariana pronta para a demonstração (login teste.aluno@studio.com).");
}

main().catch((e) => { console.error("\n✗ Erro:", e.message ?? e); process.exit(1); });
