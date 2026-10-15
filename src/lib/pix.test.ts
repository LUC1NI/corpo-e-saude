import assert from "node:assert/strict";
import { test } from "node:test";

import { crc16, pixCopiaECola } from "./pix.ts";

test("CRC16-CCITT confere com o vetor de teste padrão", () => {
  assert.equal(crc16("123456789"), "29B1");
});

test("BR Code tem a estrutura EMV e CRC válido", () => {
  const p = pixCopiaECola({ chave: "21625312000160", nome: "Corpo & Saúde", cidade: "Mafra", valor: 280, txid: "OUT2026" });
  assert.ok(p.startsWith("000201"));
  assert.ok(p.includes("0014br.gov.bcb.pix0114216253120001605"));
  assert.ok(p.includes("5406280.00"));
  assert.ok(p.includes("5911CORPO SAUDE"));
  assert.ok(p.includes("6005MAFRA"));
  assert.equal(p.slice(-4), crc16(p.slice(0, -4)));
});
