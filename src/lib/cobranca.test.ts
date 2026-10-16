import assert from "node:assert/strict";
import { test } from "node:test";

import { agruparPorAluno, linkCobranca, type CobrancaAberta } from "./cobranca.ts";

const p = (id: string, aluno: string, vencimento: string, valor = 100): CobrancaAberta => ({
  id,
  aluno_id: aluno,
  competencia: `${vencimento.slice(0, 7)}-01`,
  vencimento,
  valor,
  alunos: { nome: aluno, telefone: "(47) 99999-0000" },
});

test("agrupa por aluno, soma e põe atrasados primeiro", () => {
  const grupos = agruparPorAluno(
    [p("1", "Bia", "2026-09-10"), p("2", "Ana", "2026-10-14"), p("3", "Bia", "2026-10-10", 150), p("4", "Caio", "2026-10-16")],
    "2026-10-15",
  );
  assert.deepEqual(grupos.map((g) => g.nome), ["Bia", "Ana", "Caio"]);
  assert.equal(grupos[0]!.total, 250);
  assert.equal(grupos[0]!.totalVencido, 250);
  assert.equal(grupos[1]!.totalVencido, 100);
  assert.equal(grupos[0]!.itens[0]!.id, "1"); // "Recebi" age no mês mais antigo
  assert.equal(grupos[2]!.atrasado, false); // vence amanhã: ainda não é atraso
});

test("atrasado cobra só o vencido; o mês a vencer fica à parte", () => {
  const [g] = agruparPorAluno([p("1", "Ana", "2026-10-05"), p("2", "Ana", "2026-11-05")], "2026-10-15");
  assert.equal(g!.totalVencido, 100);
  assert.equal(g!.total, 200);
  assert.deepEqual(g!.vencidos.map((v) => v.id), ["1"]);
});

test("vencimento hoje não é atraso", () => {
  assert.equal(agruparPorAluno([p("1", "Ana", "2026-10-15")], "2026-10-15")[0]!.atrasado, false);
});

test("link de cobrança usa DDI 55 e leva o valor", () => {
  const url = linkCobranca("Ana Souza", "(47) 99999-0000", [{ competencia: "2026-10-01", valor: 280 }]);
  assert.match(url, /^https:\/\/wa\.me\/5547999990000\?text=/);
  assert.match(decodeURIComponent(url), /Olá, Ana!/);
});
