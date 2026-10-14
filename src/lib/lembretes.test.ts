import assert from "node:assert/strict";
import { test } from "node:test";

import {
  janelaLembretes,
  lembreteDoPagamento,
  textoLembrete,
} from "./lembretes.ts";

const hoje = "2026-10-13";

test("3 dias antes, no dia e 3 dias depois", () => {
  assert.equal(lembreteDoPagamento("2026-10-16", hoje), "mensalidade_antes");
  assert.equal(lembreteDoPagamento("2026-10-13", hoje), "mensalidade_dia");
  assert.equal(lembreteDoPagamento("2026-10-10", hoje), "mensalidade_atraso");
});

test("fora das janelas não avisa", () => {
  assert.equal(lembreteDoPagamento("2026-10-20", hoje), null); // 7 dias antes
  assert.equal(lembreteDoPagamento("2026-10-12", hoje), null); // 1 dia de atraso
  assert.equal(lembreteDoPagamento("2026-10-01", hoje), null); // 12 dias: velho demais
});

test("cron perdido: ainda avisa no dia seguinte", () => {
  assert.equal(lembreteDoPagamento("2026-10-15", hoje), "mensalidade_antes"); // 2 dias
  assert.equal(lembreteDoPagamento("2026-10-09", hoje), "mensalidade_atraso"); // 4 dias
});

test("janela da query cobre de -10 a +3 dias", () => {
  assert.deepEqual(janelaLembretes(hoje), { de: "2026-10-03", ate: "2026-10-16" });
});

test("texto sem travessão e com data dd/mm", () => {
  const t = textoLembrete("mensalidade_antes", "2026-10-16", 180);
  assert.equal(t.titulo, "Sua mensalidade vence em 16/10");
  assert.ok(!/[—–]/.test(t.titulo + t.corpo));
});
