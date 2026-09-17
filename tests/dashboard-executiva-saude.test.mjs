import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ALTA_CPL_ATENCAO,
  QUEDA_INVESTIMENTO_CRITICA,
  classifyClientHealth,
  sortByHealthSeverity,
} from "../app/dashboard/executiva/clientHealth.ts";

const page = readFileSync(new URL("../app/dashboard/executiva/page.tsx", import.meta.url), "utf8");

const base = (overrides = {}) => ({
  clienteId: "c1",
  nome: "Cliente Teste",
  temContaMeta: true,
  cobranca: { status: "pago", diaVencimento: 10 },
  diaHoje: 15,
  diasParaFimContrato: 200,
  sincronizacao: "ok",
  gastoUltimos7: 1000,
  gastoAnteriores7: 1000,
  leadsMetaUltimos7: 10,
  leadsMetaAnteriores7: 10,
  leadsCrmUltimos7: 3,
  ...overrides,
});

test("cliente sem nenhum sinal de problema é saudável", () => {
  const result = classifyClientHealth(base());
  assert.equal(result.nivel, "saudavel");
});

test("cobrança em atraso é crítico, mesmo com mídia estável", () => {
  const result = classifyClientHealth(base({ cobranca: { status: "atrasado", diaVencimento: 10 } }));
  assert.equal(result.nivel, "critico");
  assert.match(result.motivos.join(), /atraso/);
});

test("cobrança pendente após o dia de vencimento também é atraso", () => {
  const result = classifyClientHealth(base({ cobranca: { status: "pendente", diaVencimento: 10 }, diaHoje: 11 }));
  assert.equal(result.nivel, "critico");
});

test("cobrança pendente ainda dentro do prazo não é atraso", () => {
  const result = classifyClientHealth(base({ cobranca: { status: "pendente", diaVencimento: 20 }, diaHoje: 11 }));
  assert.notEqual(result.nivel, "critico");
});

test("contrato terminando em 7 dias ou menos é crítico", () => {
  const result = classifyClientHealth(base({ diasParaFimContrato: 7 }));
  assert.equal(result.nivel, "critico");
});

test("contrato terminando entre 8 e 30 dias é apenas atenção", () => {
  const result = classifyClientHealth(base({ diasParaFimContrato: 25 }));
  assert.equal(result.nivel, "atencao");
});

test("sincronização Meta falhou é crítico", () => {
  const result = classifyClientHealth(base({ sincronizacao: "falhou" }));
  assert.equal(result.nivel, "critico");
  assert.match(result.motivos.join(), /sincroniza/i);
});

test("sem registro de sincronização recente também é crítico", () => {
  const result = classifyClientHealth(base({ sincronizacao: "sem_registro" }));
  assert.equal(result.nivel, "critico");
});

test("queda de investimento abaixo do limite não é crítico", () => {
  const result = classifyClientHealth(base({ gastoAnteriores7: 1000, gastoUltimos7: 1000 * (1 - QUEDA_INVESTIMENTO_CRITICA) + 1 }));
  assert.notEqual(result.nivel, "critico");
});

test("queda de investimento no limite ou acima é crítico", () => {
  const result = classifyClientHealth(base({ gastoAnteriores7: 1000, gastoUltimos7: 1000 * (1 - QUEDA_INVESTIMENTO_CRITICA) }));
  assert.equal(result.nivel, "critico");
  assert.match(result.motivos.join(), /Investimento caiu/);
});

test("CPL subindo abaixo do limite não gera atenção", () => {
  const cplAnterior = 1000 / 10;
  const cplAlvo = cplAnterior * (1 + ALTA_CPL_ATENCAO) - 0.5;
  const result = classifyClientHealth(base({ gastoAnteriores7: 1000, leadsMetaAnteriores7: 10, gastoUltimos7: cplAlvo * 10, leadsMetaUltimos7: 10 }));
  assert.notEqual(result.nivel, "atencao");
});

test("CPL subindo no limite gera atenção", () => {
  const cplAnterior = 1000 / 10;
  const cplAlvo = cplAnterior * (1 + ALTA_CPL_ATENCAO);
  const result = classifyClientHealth(base({ gastoAnteriores7: 1000, leadsMetaAnteriores7: 10, gastoUltimos7: cplAlvo * 10, leadsMetaUltimos7: 10 }));
  assert.equal(result.nivel, "atencao");
  assert.match(result.motivos.join(), /Custo por lead subiu/);
});

test("gastando em anúncios sem nenhum lead novo no CRM é atenção", () => {
  const result = classifyClientHealth(base({ gastoUltimos7: 500, leadsCrmUltimos7: 0 }));
  assert.equal(result.nivel, "atencao");
  assert.match(result.motivos.join(), /sem nenhum lead novo/);
});

test("gasto residual sem lead não dispara alerta (abaixo do mínimo relevante)", () => {
  const result = classifyClientHealth(base({ gastoAnteriores7: 10, gastoUltimos7: 10, leadsCrmUltimos7: 0 }));
  assert.equal(result.nivel, "saudavel");
});

test("cobrança pendente perto do vencimento é atenção", () => {
  const result = classifyClientHealth(base({ cobranca: { status: "pendente", diaVencimento: 18 }, diaHoje: 15 }));
  assert.equal(result.nivel, "atencao");
});

test("crítico sempre prevalece sobre atenção quando ambos os sinais existem", () => {
  const result = classifyClientHealth(base({
    cobranca: { status: "atrasado", diaVencimento: 10 },
    gastoUltimos7: 500,
    leadsCrmUltimos7: 0,
  }));
  assert.equal(result.nivel, "critico");
});

test("cliente sem conta Meta conectada, sem outros problemas, fica em 'sem dados'", () => {
  const result = classifyClientHealth(base({ temContaMeta: false, sincronizacao: "ok" }));
  assert.equal(result.nivel, "sem_dados");
});

test("sinais de mídia são ignorados quando o cliente não tem conta Meta", () => {
  const result = classifyClientHealth(base({
    temContaMeta: false,
    gastoUltimos7: 0,
    gastoAnteriores7: 1000,
    sincronizacao: "sem_registro",
  }));
  assert.equal(result.nivel, "sem_dados");
});

test("ordenação prioriza crítico, depois atenção, depois sem dados, depois saudável", () => {
  const rows = [
    classifyClientHealth(base({ clienteId: "z", nome: "Zeta", temContaMeta: false })),
    classifyClientHealth(base({ clienteId: "b", nome: "Beta", cobranca: { status: "atrasado", diaVencimento: 5 } })),
    classifyClientHealth(base({ clienteId: "a", nome: "Alfa" })),
    classifyClientHealth(base({ clienteId: "y", nome: "Ypsilon", diasParaFimContrato: 20 })),
  ];
  const sorted = sortByHealthSeverity(rows);
  assert.deepEqual(sorted.map((r) => r.nivel), ["critico", "atencao", "sem_dados", "saudavel"]);
});

test("página integra a seção de saúde no topo, usando financeiro (não status_pagamento) para atraso", () => {
  assert.match(page, /<ClientHealthSection/);
  assert.match(page, /from\("financeiro"\)/);
  assert.match(page, /from\("meta_ads_sync_run_items"\)/);
  assert.match(page, /garantirCobrancasDoMes/);
  assert.match(page, /classifyClientHealth/);
});
