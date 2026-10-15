import assert from "node:assert/strict";
import { test } from "node:test";

import { lerDecimalBR, plural } from "./formato.ts";

test("lerDecimalBR entende o jeito brasileiro de digitar", () => {
  assert.equal(lerDecimalBR("45,00"), "45.00");
  assert.equal(lerDecimalBR("1.234,56"), "1234.56");
  assert.equal(lerDecimalBR("R$ 2.500"), "2500");
  assert.equal(lerDecimalBR("45.5"), "45.5");
  assert.equal(lerDecimalBR("1.70"), "1.70");
  assert.equal(lerDecimalBR(""), undefined);
  assert.equal(lerDecimalBR(12), 12);
});

test("plural sem (s)", () => {
  assert.equal(plural(1, "aula", "aulas"), "1 aula");
  assert.equal(plural(0, "aula", "aulas"), "0 aulas");
});

test("lerDecimalBR recusa formatos ambíguos", () => {
  assert.equal(lerDecimalBR("1,234.56"), "invalido");
  assert.equal(lerDecimalBR("1,5,3"), "invalido");
  assert.equal(lerDecimalBR("1e5"), "invalido");
  assert.equal(lerDecimalBR("-10"), "invalido");
  assert.equal(lerDecimalBR("R$ 1.234,56"), "1234.56");
  assert.equal(lerDecimalBR("0,5"), "0.5");
  assert.equal(lerDecimalBR("1.000"), "1000");
});
