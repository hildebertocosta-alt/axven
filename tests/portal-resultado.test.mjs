import assert from "node:assert/strict";
import test from "node:test";
import { funil, rankingAnuncios, resolverPeriodo, resumoResultado } from "../app/lib/portalResultado.ts";

const ETAPAS = [
  { chave: "lead", nome: "Novo", tipo: "novo" },
  { chave: "qualificado", nome: "Qualificado", tipo: "qualificacao" },
  { chave: "oportunidade", nome: "Visita", tipo: "oportunidade" },
  { chave: "fechado", nome: "Venda", tipo: "venda" },
  { chave: "perdido", nome: "Perdido", tipo: "perdido" },
];
const L = (etapa, over = {}) => ({ etapa, etapaAntesDaPerda: null, valor: null, anuncioId: "A1", anuncioNome: "V01", ...over });

test("período: mês atual é o padrão; 7 e 30 dias contam o dia de hoje", () => {
  assert.deepEqual(resolverPeriodo({}, "2026-09-29"), { chave: "mes", inicio: "2026-09-01", fim: "2026-09-29", rotulo: "Este mês" });
  assert.deepEqual(resolverPeriodo({ periodo: "7d" }, "2026-09-29"), { chave: "7d", inicio: "2026-09-23", fim: "2026-09-29", rotulo: "Últimos 7 dias" });
  assert.deepEqual(resolverPeriodo({ periodo: "30d" }, "2026-03-01"), { chave: "30d", inicio: "2026-01-31", fim: "2026-03-01", rotulo: "Últimos 30 dias" });
});

test("período personalizado válido é aceito; inválido volta para o mês atual", () => {
  assert.deepEqual(resolverPeriodo({ periodo: "personalizado", inicio: "2026-09-10", fim: "2026-09-20" }, "2026-09-29"),
    { chave: "personalizado", inicio: "2026-09-10", fim: "2026-09-20", rotulo: "10/09/2026 a 20/09/2026" });
  for (const p of [
    { periodo: "personalizado", inicio: "2026-09-20", fim: "2026-09-10" },
    { periodo: "personalizado", inicio: "ontem", fim: "2026-09-10" },
    { periodo: "personalizado", inicio: "2024-01-01", fim: "2026-09-10" },
    { periodo: "xyz" },
  ]) {
    assert.equal(resolverPeriodo(p, "2026-09-29").chave, "mes");
  }
});

test("resumo: vendas, receita, custo por venda, ROAS e ticket médio", () => {
  const leads = [L("lead"), L("qualificado"), L("fechado", { valor: 3000 }), L("fechado", { valor: 1000 }), L("perdido")];
  const gastos = [{ adId: "A1", adNome: "V01", gasto: 800 }, { adId: "A2", adNome: "V02", gasto: 200 }];
  assert.deepEqual(resumoResultado(ETAPAS, leads, gastos), {
    investimento: 1000, leads: 5, vendas: 2, receita: 4000, custoPorVenda: 500, roas: 4, ticketMedio: 2000,
  });
});

test("resumo sem investimento e sem venda não divide por zero", () => {
  assert.deepEqual(resumoResultado(ETAPAS, [L("lead")], []), {
    investimento: 0, leads: 1, vendas: 0, receita: 0, custoPorVenda: null, roas: null, ticketMedio: null,
  });
});

test("funil: quantos alcançaram cada etapa, a passagem e o gargalo", () => {
  const leads = [
    ...Array.from({ length: 6 }, () => L("lead")),
    ...Array.from({ length: 2 }, () => L("qualificado")),
    L("oportunidade"),
    L("fechado", { valor: 500 }),
    L("perdido", { etapaAntesDaPerda: "qualificado" }),
    L("perdido", { etapaAntesDaPerda: null }),
  ];
  const r = funil(ETAPAS, leads);
  assert.deepEqual(r.etapas.map((e) => [e.chave, e.alcancaram]), [["lead", 12], ["qualificado", 5], ["oportunidade", 2], ["fechado", 1]]);
  assert.deepEqual(r.etapas.map((e) => e.passagem === null ? null : Math.round(e.passagem * 100)), [null, 42, 40, 50]);
  assert.deepEqual(r.gargalo, { chave: "qualificado", nome: "Qualificado", perdaPct: 60 });
});

test("funil: etapa com menos de 5 leads não vira gargalo; sem leads não há gargalo", () => {
  const poucos = funil(ETAPAS, [L("lead"), L("lead"), L("qualificado")]);
  assert.equal(poucos.gargalo, null);
  const vazio = funil(ETAPAS, []);
  assert.equal(vazio.gargalo, null);
  assert.deepEqual(vazio.etapas.map((e) => e.alcancaram), [0, 0, 0, 0]);
});

test("funil: perdido com etapa antiga (chave que não existe mais) conta como parado no início", () => {
  const r = funil(ETAPAS, [L("perdido", { etapaAntesDaPerda: "desqualificado" })]);
  assert.deepEqual(r.etapas.map((e) => e.alcancaram), [1, 0, 0, 0]);
});

test("ranking por anúncio: receita, vendas e custo por venda; anúncio sem lead e lead sem anúncio aparecem", () => {
  const leads = [
    L("fechado", { valor: 2000, anuncioId: "A1", anuncioNome: "V01" }),
    L("lead", { anuncioId: "A1", anuncioNome: "V01" }),
    L("fechado", { valor: 500, anuncioId: "A2", anuncioNome: "V02" }),
    L("qualificado", { anuncioId: null, anuncioNome: null }),
  ];
  const gastos = [{ adId: "A1", adNome: "V01 · Bros", gasto: 400 }, { adId: "A2", adNome: "V02", gasto: 1000 }, { adId: "A3", adNome: "V03", gasto: 50 }];
  assert.deepEqual(rankingAnuncios(ETAPAS, leads, gastos), [
    { chave: "A1", nome: "V01 · Bros", leads: 2, vendas: 1, receita: 2000, investimento: 400, custoPorVenda: 400 },
    { chave: "A2", nome: "V02", leads: 1, vendas: 1, receita: 500, investimento: 1000, custoPorVenda: 1000 },
    { chave: "sem-anuncio", nome: "Sem anúncio identificado", leads: 1, vendas: 0, receita: 0, investimento: 0, custoPorVenda: null },
    { chave: "A3", nome: "V03", leads: 0, vendas: 0, receita: 0, investimento: 50, custoPorVenda: null },
  ]);
});
