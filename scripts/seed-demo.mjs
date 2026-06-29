import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

/**
 * Seed de DEMONSTRAÇÃO: popula o app com um cenário realista de studio para
 * testar todas as telas. Idempotente (limpa os dados demo anteriores pelo
 * conjunto de alunos demo). Usa service_role — rode só localmente.
 *
 *   npm run seed:demo
 *
 * Não cria logins de aluno extras (o login de aluno de teste já é a Mariana
 * = teste.aluno@studio.com). O dono gera acesso pela tela quando quiser.
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
const addMeses = (base, n) => new Date(base.getFullYear(), base.getMonth() + n, base.getDate());
const primeiroDoMes = (base, n = 0) => ISO(new Date(base.getFullYear(), base.getMonth() + n, 1));

async function main() {
  // refs base
  const { data: prof } = await db.from("professores").select("id").eq("nome", "Carlos Personal").single();
  if (!prof) throw new Error("Professor 'Carlos Personal' não encontrado (rode os outros seeds primeiro).");
  const { data: adminU } = await db.from("usuarios").select("id").eq("papel", "admin").limit(1).single();

  // ---------------- PLANOS ----------------
  const planosDef = [
    { nome: "Mensal Presencial", descricao: "Acesso presencial, renovação mensal.", valor: 180, periodicidade: "mensal", duracao_meses: null, ativo: true },
    { nome: "Trimestral Presencial", descricao: "3 meses com desconto.", valor: 480, periodicidade: "trimestral", duracao_meses: 3, ativo: true },
    { nome: "Online", descricao: "Acompanhamento online.", valor: 99, periodicidade: "mensal", duracao_meses: null, ativo: true },
    { nome: "Plano Antigo (inativo)", descricao: "Descontinuado.", valor: 150, periodicidade: "mensal", duracao_meses: null, ativo: false },
  ];
  const planos = {};
  for (const p of planosDef) {
    const { data: ex } = await db.from("planos").select("id").eq("nome", p.nome).maybeSingle();
    if (ex) { await db.from("planos").update(p).eq("id", ex.id); planos[p.nome] = ex.id; }
    else { const { data } = await db.from("planos").insert(p).select("id").single(); planos[p.nome] = data.id; }
  }
  console.log(`✓ Planos: ${Object.keys(planos).length}`);

  // ---------------- ALUNOS DEMO ----------------
  const alunosDef = [
    { nome: "João Pereira", tipo: "presencial", status: "ativo", telefone: "(47) 99101-0001", email: "joao.demo@exemplo.com", plano: "Mensal Presencial", inicioMesesAtras: 5, situacao: "em_dia" },
    { nome: "Ana Souza", tipo: "presencial", status: "ativo", telefone: "(47) 99101-0002", email: "ana.demo@exemplo.com", plano: "Trimestral Presencial", inicioMesesAtras: 4, situacao: "em_dia" },
    { nome: "Bruno Lima", tipo: "online", status: "ativo", telefone: "(47) 99101-0003", email: "bruno.demo@exemplo.com", plano: "Online", inicioMesesAtras: 3, situacao: "pendente" },
    { nome: "Carla Mendes", tipo: "presencial", status: "ativo", telefone: "(47) 99101-0004", email: "carla.demo@exemplo.com", plano: "Mensal Presencial", inicioMesesAtras: 6, situacao: "vencido" },
    { nome: "Diego Rocha", tipo: "online", status: "ativo", telefone: "(47) 99101-0005", email: "diego.demo@exemplo.com", plano: "Online", inicioMesesAtras: 2, situacao: "em_dia" },
    { nome: "Elaine Costa", tipo: "presencial", status: "inativo", telefone: "(47) 99101-0006", email: null, plano: null, inicioMesesAtras: 0, situacao: null },
  ];

  // limpa dados demo anteriores
  const nomesDemo = alunosDef.map((a) => a.nome);
  const { data: antigos } = await db.from("alunos").select("id").in("nome", nomesDemo);
  for (const a of antigos ?? []) {
    await db.from("pagamentos").delete().eq("aluno_id", a.id);
    await db.from("matriculas").delete().eq("aluno_id", a.id);
    await db.from("presencas").delete().eq("aluno_id", a.id);
    await db.from("anamneses").delete().eq("aluno_id", a.id);
    await db.from("avaliacoes_fisicas").delete().eq("aluno_id", a.id);
    // treinos -> cascade divisões/exercícios
    await db.from("treinos").delete().eq("aluno_id", a.id);
    await db.from("alunos").delete().eq("id", a.id);
  }

  const alunos = {};
  for (const a of alunosDef) {
    const { data } = await db.from("alunos").insert({
      nome: a.nome, tipo: a.tipo, status: a.status, telefone: a.telefone, email: a.email, professor_id: prof.id,
    }).select("id").single();
    alunos[a.nome] = data.id;
  }
  console.log(`✓ Alunos demo: ${Object.keys(alunos).length}`);

  // ---------------- MATRÍCULAS + PAGAMENTOS ----------------
  let nPag = 0, nMat = 0;
  for (const a of alunosDef) {
    if (!a.plano) continue;
    const planoId = planos[a.plano];
    const valor = planosDef.find((p) => p.nome === a.plano).valor;
    const inicio = addMeses(hoje, -a.inicioMesesAtras);
    // próxima cobrança = mês que vem
    const proxima = primeiroDoMes(hoje, 1);
    const { data: mat } = await db.from("matriculas").insert({
      aluno_id: alunos[a.nome], plano_id: planoId, data_inicio: ISO(inicio),
      data_proxima_cobranca: proxima, renovacao_automatica: true, status: "ativa",
    }).select("id").single();
    nMat++;

    // histórico de pagamentos: meses anteriores pagos; mês atual conforme situação
    for (let m = a.inicioMesesAtras; m >= 0; m--) {
      const comp = primeiroDoMes(hoje, -m);
      const venc = primeiroDoMes(hoje, -m);
      let status = "pago";
      let data_pagamento = comp;
      let forma = "PIX";
      if (m === 0) {
        if (a.situacao === "pendente") { status = "pendente"; data_pagamento = null; forma = null; }
        else if (a.situacao === "vencido") { status = "vencido"; data_pagamento = null; forma = null; }
      }
      await db.from("pagamentos").insert({
        matricula_id: mat.id, aluno_id: alunos[a.nome], competencia: comp, valor, vencimento: venc,
        data_pagamento, status, forma_pagamento: forma,
      });
      nPag++;
    }
  }
  console.log(`✓ Matrículas: ${nMat} · Pagamentos: ${nPag}`);

  // ---------------- DESPESAS ----------------
  const { data: cats } = await db.from("categorias_despesa").select("id, nome");
  const cat = (n) => cats.find((c) => c.nome === n)?.id ?? null;
  await db.from("despesas").delete().like("descricao", "[demo]%");
  const despesasDef = [
    { descricao: "[demo] Aluguel do espaço", categoria_id: cat("Aluguel"), valor: 2500, data: primeiroDoMes(hoje) },
    { descricao: "[demo] Halteres e anilhas novas", categoria_id: cat("Material e equipamentos"), valor: 1200, data: primeiroDoMes(hoje) },
    { descricao: "[demo] Conta de energia", categoria_id: cat("Energia e água"), valor: 430, data: primeiroDoMes(hoje) },
    { descricao: "[demo] Internet", categoria_id: cat("Internet e telefone"), valor: 150, data: primeiroDoMes(hoje) },
    { descricao: "[demo] Anúncios Instagram", categoria_id: cat("Marketing"), valor: 300, data: primeiroDoMes(hoje, -1) },
  ];
  for (const d of despesasDef) await db.from("despesas").insert({ ...d, criado_por: adminU?.id ?? null });
  console.log(`✓ Despesas: ${despesasDef.length}`);

  // ---------------- HORÁRIOS (grade do Carlos) ----------------
  await db.from("horarios").delete().eq("professor_id", prof.id);
  const horariosDef = [];
  for (const dia of [1, 3, 5]) { // seg, qua, sex
    horariosDef.push({ professor_id: prof.id, dia_semana: dia, hora_inicio: "06:00", hora_fim: "07:00", capacidade: 6 });
    horariosDef.push({ professor_id: prof.id, dia_semana: dia, hora_inicio: "18:00", hora_fim: "19:00", capacidade: 8 });
  }
  for (const dia of [2, 4]) { // ter, qui
    horariosDef.push({ professor_id: prof.id, dia_semana: dia, hora_inicio: "07:00", hora_fim: "08:00", capacidade: 5 });
  }
  await db.from("horarios").insert(horariosDef);
  console.log(`✓ Horários: ${horariosDef.length}`);

  // ---------------- PRESENÇAS (últimos dias) ----------------
  const presencaAlunos = ["João Pereira", "Ana Souza", "Diego Rocha"];
  let nPres = 0;
  for (let d = 1; d <= 6; d++) {
    const dia = ISO(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - d));
    for (const nome of presencaAlunos) {
      if ((d + nome.length) % 2 === 0) continue; // varia um pouco
      await db.from("presencas").insert({ aluno_id: alunos[nome], professor_id: prof.id, data: dia, hora: "18:00" });
      nPres++;
    }
  }
  console.log(`✓ Presenças: ${nPres}`);

  // ---------------- ANAMNESES ----------------
  const anamneseDef = [
    { nome: "João Pereira", objetivos: "Hipertrofia e ganho de força.", historico_saude: "Sem comorbidades.", lesoes_restricoes: "Leve dor lombar.", medicacao: "Nenhuma.", rotina_disponibilidade: "Seg/Qua/Sex de manhã.", nivel_atividade: "Moderado" },
    { nome: "Ana Souza", objetivos: "Emagrecimento e condicionamento.", historico_saude: "Hipertensão controlada.", lesoes_restricoes: "Nenhuma.", medicacao: "Losartana.", rotina_disponibilidade: "Noite.", nivel_atividade: "Leve" },
    { nome: "Diego Rocha", objetivos: "Saúde geral.", historico_saude: "—", lesoes_restricoes: "—", medicacao: "—", rotina_disponibilidade: "Flexível (online).", nivel_atividade: "Intenso" },
  ];
  for (const an of anamneseDef) {
    await db.from("anamneses").insert({
      aluno_id: alunos[an.nome], objetivos: an.objetivos, historico_saude: an.historico_saude,
      lesoes_restricoes: an.lesoes_restricoes, medicacao: an.medicacao, rotina_disponibilidade: an.rotina_disponibilidade,
      nivel_atividade: an.nivel_atividade, criado_por: prof.id,
    });
  }
  console.log(`✓ Anamneses: ${anamneseDef.length}`);

  // ---------------- AVALIAÇÕES (série p/ gráfico) ----------------
  let nAv = 0;
  const series = {
    "João Pereira": [{ peso: 82, pg: 22 }, { peso: 80.5, pg: 20 }, { peso: 79, pg: 18.5 }, { peso: 78, pg: 17 }],
    "Ana Souza": [{ peso: 70, pg: 30 }, { peso: 68.5, pg: 28 }, { peso: 67, pg: 26.5 }],
  };
  for (const [nome, pts] of Object.entries(series)) {
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const data = primeiroDoMes(hoje, -(pts.length - 1 - i));
      await db.from("avaliacoes_fisicas").insert({
        aluno_id: alunos[nome], data, peso: p.peso, altura: 1.75, percentual_gordura: p.pg,
        medidas: { cintura: 90 - i * 2, quadril: 100 - i, braco: 35 + i * 0.5, coxa: 58, peitoral: 100 },
        observacoes: i === pts.length - 1 ? "Boa evolução." : null, criado_por: prof.id,
      });
      nAv++;
    }
  }
  console.log(`✓ Avaliações: ${nAv}`);

  // ---------------- TREINO (1 aluno via exercícios da biblioteca) ----------------
  const { data: exs } = await db.from("exercicios").select("id, nome");
  const exId = (n) => exs.find((e) => e.nome === n)?.id;
  if (exId("Agachamento livre")) {
    const { data: tr } = await db.from("treinos").insert({
      aluno_id: alunos["João Pereira"], professor_id: prof.id, nome: "Hipertrofia João", objetivo: "Ganho de massa.", ativo: true,
    }).select("id").single();
    const divs = [
      { nome: "A", foco: "Superior", dias_semana: [1, 4], exs: [["Flexão de braço", 4, "12"], ["Barra fixa", 4, "8"], ["Rosca bíceps", 3, "12"]] },
      { nome: "B", foco: "Inferior", dias_semana: [2, 5], exs: [["Agachamento livre", 4, "10"], ["Levantamento terra", 3, "8"]] },
      { nome: "C", foco: "Cardio & Core", dias_semana: [3, 6], exs: [["Burpee", 3, "15"], ["Abdominal supra", 3, "20"]] },
    ];
    let od = 0;
    for (const d of divs) {
      const { data: div } = await db.from("treino_divisoes").insert({
        treino_id: tr.id, nome: d.nome, foco: d.foco, dias_semana: d.dias_semana, ordem: od++,
      }).select("id").single();
      let oe = 0;
      for (const [nome, series, reps] of d.exs) {
        if (!exId(nome)) continue;
        await db.from("treino_exercicios").insert({
          divisao_id: div.id, exercicio_id: exId(nome), series, repeticoes: reps, descanso: "60s", ordem: oe++,
        });
      }
    }
    console.log("✓ Treino demo (João) criado");
  }

  console.log("\n✅ Seed de demonstração concluído.");
}

main().catch((e) => { console.error("\n✗ Erro:", e.message ?? e); process.exit(1); });
