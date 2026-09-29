import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { eventIdVenda, hashSha256, montarEventoVenda, telefoneParaMeta } from "../app/lib/metaVenda.ts";

const AGORA = new Date("2026-09-30T12:00:00.000Z");
const sha = (v) => createHash("sha256").update(v).digest("hex");
const base = (over = {}) => ({ id: "L1", valor: 1500, moeda: "BRL", dataConversao: "2026-09-29T15:00:00.000Z", leadgenId: null, ctwaclid: null, pageId: null, telefone: null, email: null, ...over });

test("event_id é estável por lead", () => {
  assert.equal(eventIdVenda("abc"), "axven_venda_abc");
});

test("telefone vai com 55 e só dígitos; hash é sha256 do valor normalizado", () => {
  assert.equal(telefoneParaMeta("(81) 99911-1430"), "5581999111430");
  assert.equal(telefoneParaMeta("5581999111430"), "5581999111430");
  assert.equal(telefoneParaMeta("123"), null);
  assert.equal(hashSha256("  Teste@Email.COM "), sha("teste@email.com"));
});

test("venda de clique para WhatsApp usa ctwa_clid e business_messaging", () => {
  const r = montarEventoVenda(base({ ctwaclid: "CLID1", pageId: "P1", leadgenId: "G1" }), AGORA);
  assert.equal(r.ok, true);
  assert.deepEqual(r.evento, {
    event_name: "Purchase",
    event_time: Math.floor(new Date("2026-09-29T15:00:00.000Z").getTime() / 1000),
    event_id: "axven_venda_L1",
    action_source: "business_messaging",
    messaging_channel: "whatsapp",
    user_data: { ctwa_clid: "CLID1", page_id: "P1" },
    custom_data: { currency: "BRL", value: 1500 },
  });
});

test("venda de formulário usa lead_id do Meta e marca como CRM", () => {
  const r = montarEventoVenda(base({ leadgenId: "G1", telefone: "81999111430" }), AGORA);
  assert.deepEqual(r.evento, {
    event_name: "Purchase",
    event_time: Math.floor(new Date("2026-09-29T15:00:00.000Z").getTime() / 1000),
    event_id: "axven_venda_L1",
    action_source: "system_generated",
    user_data: { lead_id: "G1", ph: [sha("5581999111430")] },
    custom_data: { currency: "BRL", value: 1500, event_source: "crm", lead_event_source: "Axven CRM" },
  });
});

test("sem ctwa nem lead_id, usa telefone e e-mail com hash", () => {
  const r = montarEventoVenda(base({ telefone: "5581999111430", email: "A@B.com" }), AGORA);
  assert.deepEqual(r.evento.user_data, { ph: [sha("5581999111430")], em: [sha("a@b.com")] });
  assert.equal(r.evento.action_source, "system_generated");
});

test("venda sem valor ou sem nenhum identificador não é enviada", () => {
  assert.deepEqual(montarEventoVenda(base({ valor: 0, telefone: "5581999111430" }), AGORA), { ok: false, motivo: "sem_valor" });
  assert.deepEqual(montarEventoVenda(base(), AGORA), { ok: false, motivo: "sem_identificador" });
});

test("venda com data de mais de 7 dias usa o momento do envio; data futura também", () => {
  const antiga = montarEventoVenda(base({ telefone: "5581999111430", dataConversao: "2026-09-10T12:00:00.000Z" }), AGORA);
  assert.equal(antiga.evento.event_time, Math.floor(AGORA.getTime() / 1000));
  const futura = montarEventoVenda(base({ telefone: "5581999111430", dataConversao: "2026-10-05T12:00:00.000Z" }), AGORA);
  assert.equal(futura.evento.event_time, Math.floor(AGORA.getTime() / 1000));
  const semData = montarEventoVenda(base({ telefone: "5581999111430", dataConversao: null, moeda: null }), AGORA);
  assert.equal(semData.evento.event_time, Math.floor(AGORA.getTime() / 1000));
  assert.equal(semData.evento.custom_data.currency, "BRL");
});
