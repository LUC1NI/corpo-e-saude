import assert from "node:assert/strict";
import { test } from "node:test";

import { cpfValido, formatarCpf } from "../cpf.ts";
import {
  descricaoServico,
  faltandoConfig,
  faltandoTomador,
  montarPayloadFocus,
  podeEmitir,
  podeTransicionar,
  referenciaNota,
  statusDaFocus,
  type ConfigFiscal,
  type DadosTomador,
} from "./regras.ts";

test("CPF: dígitos verificadores", () => {
  assert.equal(cpfValido("529.982.247-25"), true);
  assert.equal(cpfValido("52998224725"), true);
  assert.equal(cpfValido("529.982.247-24"), false); // DV errado
  assert.equal(cpfValido("111.111.111-11"), false); // repetido
  assert.equal(cpfValido("1234"), false);
  assert.equal(formatarCpf("52998224725"), "529.982.247-25");
});

test("referência idempotente por pagamento", () => {
  assert.equal(referenciaNota("abc"), "pag-abc");
  assert.equal(referenciaNota("abc"), referenciaNota("abc")); // reenvio = mesma ref
  assert.equal(referenciaNota("abc", 1), "pag-abc-2"); // após 1 cancelada
});

test("template da descrição", () => {
  assert.equal(
    descricaoServico("Mensalidade {plano}, competência {mes}/{ano}", {
      plano: "Mensal Presencial",
      competencia: "2026-10-01",
      aluno: "Ana",
    }),
    "Mensalidade Mensal Presencial, competência 10/2026",
  );
});

test("transições de status", () => {
  assert.equal(podeTransicionar("aguardando_configuracao", "processando"), true);
  assert.equal(podeTransicionar("processando", "autorizada"), true);
  assert.equal(podeTransicionar("autorizada", "cancelada"), true);
  assert.equal(podeTransicionar("autorizada", "erro"), false);
  assert.equal(podeTransicionar("cancelada", "processando"), false);
  assert.equal(podeEmitir("erro"), true);
  assert.equal(podeEmitir("autorizada"), false);
  assert.equal(statusDaFocus("autorizado"), "autorizada");
  assert.equal(statusDaFocus("erro_autorizacao"), "erro");
  assert.equal(statusDaFocus("processando_autorizacao"), "processando");
});

const config: ConfigFiscal = {
  ativo: true,
  ambiente: "homologacao",
  api_nfse: "nfse",
  regime: "simples_nacional",
  cnpj: "12345678000190",
  inscricao_municipal: "1234",
  codigo_servico: "06.04",
  codigo_tributacao_nacional: "060401",
  aliquota_iss: 2,
  natureza_operacao: "107",
  descricao_servico_padrao: "Mensalidade {plano}",
  emitir_automaticamente_na_baixa: true,
};

const tomador: DadosTomador = {
  nome: "Ana Souza",
  email: "ana@ex.com",
  cpf: "52998224725",
  cep: "89300000",
  logradouro: "Rua A",
  numero: "10",
  complemento: null,
  bairro: "Centro",
  cidade: "Mafra",
  uf: "SC",
  codigo_municipio: "4210100",
};

const nota = {
  valor: 180,
  competencia: "2026-10-01",
  descricao: "Mensalidade Mensal",
  dataEmissao: "2026-10-13T10:00:00-03:00",
};

test("dados obrigatórios do tomador e da config", () => {
  assert.deepEqual(faltandoTomador(tomador), []);
  assert.deepEqual(faltandoTomador({ ...tomador, cpf: null, numero: "" }), [
    "CPF",
    "número",
  ]);
  assert.deepEqual(faltandoConfig(config), []);
  assert.ok(faltandoConfig({ ...config, cnpj: null }).includes("CNPJ"));
});

test("payload NFS-e municipal (Mafra)", () => {
  const p = montarPayloadFocus("nfse", config, tomador, nota) as {
    natureza_operacao: string;
    prestador: { codigo_municipio: string };
    tomador: { cpf: string; endereco: Record<string, unknown> };
    servico: { valor_servicos: number; item_lista_servico: string };
  };
  assert.equal(p.natureza_operacao, "107");
  assert.equal(p.prestador.codigo_municipio, "4210100");
  assert.equal(p.tomador.cpf, "52998224725");
  assert.equal("complemento" in p.tomador.endereco, false);
  assert.equal(p.servico.valor_servicos, 180);
  assert.equal(p.servico.item_lista_servico, "06.04");
});

test("payload NFS-e Nacional", () => {
  const p = montarPayloadFocus("nfsen", config, tomador, nota);
  assert.equal(p.cpf_tomador, "52998224725");
  assert.equal(p.codigo_municipio_emissora, 4210100);
  assert.equal(p.codigo_tributacao_nacional_iss, "060401");
  assert.equal(p.codigo_opcao_simples_nacional, 3);
  assert.equal(p.data_competencia, "2026-10-01");
});

test("CSV: aspas, separador e proteção contra fórmula", async () => {
  const { linhaCsv } = await import("./regras.ts");
  assert.equal(linhaCsv(["Ana", 180.5, null]), '"Ana";"180.5";""');
  assert.equal(linhaCsv(['=HYPERLINK("x")']), '"\'=HYPERLINK(""x"")"');
});
