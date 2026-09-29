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

test("respostas do formulário viram pergunta e resposta legíveis", async () => {
  const { formatarRespostas } = await import("../app/lib/portalLeads.ts");
  assert.deepEqual(formatarRespostas({
    "o_que_mais_chamou_sua_atenção_no_vídeo?": "o_tamanho_do_terreno_(9,2_hectares)",
    "quer_receber_mais_fotos?": "sim,_me_manda!",
    "interesses": ["lazer", "investimento"],
    "idade": 42,
    "vazio": "",
    "nulo": null,
  }), [
    { pergunta: "O que mais chamou sua atenção no vídeo?", resposta: "O tamanho do terreno (9,2 hectares)" },
    { pergunta: "Quer receber mais fotos?", resposta: "Sim, me manda!" },
    { pergunta: "Interesses", resposta: "Lazer, investimento" },
    { pergunta: "Idade", resposta: "42" },
  ]);
  assert.deepEqual(formatarRespostas(null), []);
  assert.deepEqual(formatarRespostas("texto solto"), []);
  assert.deepEqual(formatarRespostas(["a"]), []);
});

test("link do WhatsApp usa só os dígitos e põe o 55 quando falta", async () => {
  const { linkWhatsApp } = await import("../app/lib/portalLeads.ts");
  assert.equal(linkWhatsApp("5581999111430"), "https://wa.me/5581999111430");
  assert.equal(linkWhatsApp("(81) 99911-1430"), "https://wa.me/5581999111430");
  assert.equal(linkWhatsApp(null), null);
  assert.equal(linkWhatsApp("123"), null);
});

test("data de chegada aparece no horário de Brasília", async () => {
  const { formatarChegada } = await import("../app/lib/portalLeads.ts");
  assert.equal(formatarChegada("2026-09-28T17:32:00Z"), "28/09/2026 14:32");
  assert.equal(formatarChegada("2026-09-29T02:10:00Z"), "28/09/2026 23:10");
  assert.equal(formatarChegada(null), "—");
  assert.equal(formatarChegada("ruim"), "—");
});

test("filtro por data de/até usa o dia de Brasília e aceita só um dos lados", async () => {
  const leads = [
    lead({ id: "a", criado_em: "2026-09-10T02:00:00Z" }),
    lead({ id: "b", criado_em: "2026-09-10T15:00:00Z" }),
    lead({ id: "c", criado_em: "2026-09-20T12:00:00Z" }),
    lead({ id: "d", criado_em: "2026-09-21T02:59:00Z" }),
  ];
  const ids = (f) => filtrarLeads(leads, { ...FILTRO_INICIAL, ...f }, ENCERRADAS, AGORA).map((l) => l.id);
  assert.deepEqual(ids({ de: "2026-09-10", ate: "2026-09-20" }), ["b", "c", "d"]);
  assert.deepEqual(ids({ de: "2026-09-11" }), ["c", "d"]);
  assert.deepEqual(ids({ ate: "2026-09-09" }), ["a"]);
  assert.deepEqual(ids({ de: "data ruim" }), ["a", "b", "c", "d"]);
});
