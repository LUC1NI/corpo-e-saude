import assert from "node:assert/strict";
import { test } from "node:test";

import { calcularFrequencia } from "./frequencia.ts";

// 2026-10-14 = quarta (3). Terças (2) e quintas (4) às 11h.
const hoje = "2026-10-14";

test("aula só é esperada depois que o aluno entrou no horário", () => {
  // Entrou há ~3 semanas: 6 aulas (ter/qui) até ontem, veio em todas.
  const vinculos = [
    { dia_semana: 2, desde: "2026-09-22" },
    { dia_semana: 4, desde: "2026-09-22" },
  ];
  const presencas = ["2026-09-22", "2026-09-24", "2026-09-29", "2026-10-01", "2026-10-06", "2026-10-08", "2026-10-13"];
  const r = calcularFrequencia(vinculos, presencas, hoje);
  assert.equal(r.esperado, 7);
  assert.equal(r.pct, 100);
});

test("aluno recém-chegado é 'novo', não 'crítico'", () => {
  const r = calcularFrequencia([{ dia_semana: 2, desde: "2026-10-10" }], [], hoje);
  assert.equal(r.esperado, 1);
  assert.equal(r.pct, null);
  assert.equal(r.novo, true);
});

test("sem horário fixo: sem percentual", () => {
  const r = calcularFrequencia([], ["2026-10-01"], hoje);
  assert.equal(r.pct, null);
  assert.equal(r.novo, false);
});

test("janela limita a 8 semanas e presença de hoje não conta ainda", () => {
  const r = calcularFrequencia([{ dia_semana: 3, desde: "2026-01-01" }], ["2026-10-14", "2026-10-07"], hoje);
  assert.equal(r.esperado, 7); // 7 quartas na janela, antes de hoje
  assert.equal(r.presente, 1);
  assert.equal(r.pct, 14);
});
