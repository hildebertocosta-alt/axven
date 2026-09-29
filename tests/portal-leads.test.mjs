import assert from "node:assert/strict";
import test from "node:test";
import { FILTRO_INICIAL, anunciosDosLeads, diasParado, estaParado, filtrarLeads } from "../app/lib/portalLeads.ts";

const AGORA = new Date("2026-09-29T15:00:00.000Z");
const ENCERRADAS = new Set(["fechado", "perdido"]);
const lead = (over = {}) => ({ id: "x", etapa: "lead", criado_em: "2026-09-20T12:00:00Z", etapa_alterada_em: "2026-09-20T12:00:00Z", anuncio: "V01", ...over });

test("dias parado conta dias inteiros desde a última mudança de etapa", () => {
  assert.equal(diasParado("2026-09-26T15:00:00.000Z", AGORA), 3);
  assert.equal(diasParado("2026-09-26T15:00:01.000Z", AGORA), 2);
  assert.equal(diasParado("2026-09-29T14:00:00.000Z", AGORA), 0);
  assert.equal(diasParado(null, AGORA), 0);
  assert.equal(diasParado("data ruim", AGORA), 0);
});

test("parado é quem está há mais de 3 dias sem mudar e não está em Venda nem Perdido", () => {
  assert.equal(estaParado(lead({ etapa_alterada_em: "2026-09-25T14:00:00Z" }), ENCERRADAS, AGORA), true);
  assert.equal(estaParado(lead({ etapa_alterada_em: "2026-09-26T15:00:00Z" }), ENCERRADAS, AGORA), false);
  assert.equal(estaParado(lead({ etapa: "perdido", etapa_alterada_em: "2026-09-01T00:00:00Z" }), ENCERRADAS, AGORA), false);
  assert.equal(estaParado(lead({ etapa: "fechado", etapa_alterada_em: "2026-09-01T00:00:00Z" }), ENCERRADAS, AGORA), false);
});

test("sem etapa_alterada_em, usa a data de chegada", () => {
  assert.equal(estaParado(lead({ etapa_alterada_em: null, criado_em: "2026-09-01T00:00:00Z" }), ENCERRADAS, AGORA), true);
});

test("filtros por etapa, parados, anúncio e chegada se combinam", () => {
  const leads = [
    lead({ id: "a", etapa: "lead", anuncio: "V01", criado_em: "2026-09-28T10:00:00Z", etapa_alterada_em: "2026-09-28T10:00:00Z" }),
    lead({ id: "b", etapa: "lead", anuncio: "V02", criado_em: "2026-09-10T10:00:00Z", etapa_alterada_em: "2026-09-10T10:00:00Z" }),
    lead({ id: "c", etapa: "qualificado", anuncio: "V01", criado_em: "2026-09-01T10:00:00Z", etapa_alterada_em: "2026-09-02T10:00:00Z" }),
    lead({ id: "d", etapa: "perdido", anuncio: null, criado_em: "2026-08-01T10:00:00Z", etapa_alterada_em: "2026-08-02T10:00:00Z" }),
  ];
  const ids = (f) => filtrarLeads(leads, { ...FILTRO_INICIAL, ...f }, ENCERRADAS, AGORA).map((l) => l.id);
  assert.deepEqual(ids({}), ["a", "b", "c", "d"]);
  assert.deepEqual(ids({ etapa: "lead" }), ["a", "b"]);
  assert.deepEqual(ids({ soParados: true }), ["b", "c"]);
  assert.deepEqual(ids({ anuncio: "V01" }), ["a", "c"]);
  assert.deepEqual(ids({ chegada: "7" }), ["a"]);
  assert.deepEqual(ids({ chegada: "30" }), ["a", "b", "c"]);
  assert.deepEqual(ids({ etapa: "lead", soParados: true }), ["b"]);
});

test("lista de anúncios para o filtro vem sem repetição, em ordem alfabética, sem vazios", () => {
  assert.deepEqual(anunciosDosLeads([lead({ anuncio: "V02" }), lead({ anuncio: "V01" }), lead({ anuncio: "V02" }), lead({ anuncio: null }), lead({ anuncio: "  " })]), ["V01", "V02"]);
});
