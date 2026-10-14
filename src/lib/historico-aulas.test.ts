import assert from "node:assert/strict";
import { test } from "node:test";

import { historicoAulas, janelaPagina } from "./historico-aulas.ts";

// 2026-10-12 = segunda (1), 2026-10-14 = quarta (3).
const horarios = [
  { dia_semana: 1, hora_inicio: "18:00:00", desde: "2026-10-01" },
  { dia_semana: 3, hora_inicio: "18:00:00", desde: "2026-10-01" },
];

test("presença, falta, extra e hoje sem falta", () => {
  const r = historicoAulas({
    horarios,
    presencas: [
      { data: "2026-10-12", hora: "18:00:00" }, // seg: presente
      { data: "2026-10-10", hora: "09:00:00" }, // sáb: extra
    ],
    inicio: "2026-10-05",
    fim: "2026-10-14",
    hoje: "2026-10-14", // qua de hoje sem presença: NÃO é falta
  });
  assert.deepEqual(r, [
    { data: "2026-10-12", hora: "18:00:00", status: "presente" },
    { data: "2026-10-10", hora: "09:00:00", status: "extra" },
    { data: "2026-10-07", hora: "18:00:00", status: "falta" },
    { data: "2026-10-05", hora: "18:00:00", status: "falta" },
  ]);
});

test("antes de entrar no horário não conta falta", () => {
  const r = historicoAulas({
    horarios: [{ dia_semana: 1, hora_inicio: "18:00:00", desde: "2026-10-10" }],
    presencas: [],
    inicio: "2026-10-01",
    fim: "2026-10-13",
    hoje: "2026-10-14",
  });
  assert.deepEqual(r, [{ data: "2026-10-12", hora: "18:00:00", status: "falta" }]);
});

test("janela de paginação de 28 dias", () => {
  assert.deepEqual(janelaPagina("2026-10-28", 0), {
    inicio: "2026-10-01",
    fim: "2026-10-28",
  });
  assert.deepEqual(janelaPagina("2026-10-28", 1), {
    inicio: "2026-09-03",
    fim: "2026-09-30",
  });
});
