import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { normalizeUazapiAcceptance, validProviderMessageId } from "../app/lib/acquisitionWhatsappOutbox.ts";

const migrationUrl = new URL("../supabase/migrations/20260914200000_add_outbox_provider_delivery_state.sql", import.meta.url);
const callbackUrl = new URL("../app/api/webhooks/aquisicao/whatsapp/enviado/route.ts", import.meta.url);

test("messageid válido produz aceite e ID canônico", () => {
  assert.deepEqual(normalizeUazapiAcceptance({ messageid: "3EB0436EB5806667C3A20B" }), {
    accepted: true,
    provider_message_id: "3EB0436EB5806667C3A20B",
  });
});

test("messageid vazio ou ausente não confirma aceite", () => {
  assert.deepEqual(normalizeUazapiAcceptance({ messageid: "  " }), { accepted: false, provider_message_id: null });
  assert.deepEqual(normalizeUazapiAcceptance({ status: "Pending" }), { accepted: false, provider_message_id: null });
});

test("Pending com messageid válido continua sendo aceito", () => {
  assert.equal(normalizeUazapiAcceptance({ status: "Pending", messageid: "abc-123" }).accepted, true);
  assert.equal(validProviderMessageId("abc-123"), true);
});

test("migration é aditiva e não altera históricos", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /add column if not exists provider_message_id text null/i);
  assert.match(sql, /add column if not exists envio_iniciado_em timestamptz null/i);
  assert.match(sql, /add column if not exists revisao_necessaria boolean not null default false/i);
  assert.doesNotMatch(sql, /\b(delete|truncate|drop)\b/i);
});

test("enviado e provider_message_id nunca são elegíveis para claim", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /provider_message_id is null/i);
  assert.match(sql, /status in \('pendente', 'falhou'\)/i);
  assert.match(sql, /revisao_necessaria = false/i);
});

test("tentativas históricas ambíguas são preservadas em revisão e não reprocessadas", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /where status = 'falhou'[\s\S]*tentativas > 0[\s\S]*provider_message_id is null/i);
  assert.match(sql, /set revisao_necessaria = true/);
  assert.doesNotMatch(sql, /set status = 'enviado'/i);
});

test("claim concorrente e lease anterior permanecem preservados", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /for update of o skip locked/i);
  assert.match(sql, /interval '10 minutes'/i);
  assert.match(sql, /tentativas < 5/i);
});

test("resultado ambíguo após início do POST exige revisão e não retry", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  const route = await readFile(callbackUrl, "utf8");
  assert.match(sql, /set status = 'falhou', revisao_necessaria = true[\s\S]*envio_iniciado_em is not null/i);
  assert.match(route, /ambiguous = !sucesso && Boolean\(current\.envio_iniciado_em\)/);
  assert.match(route, /resultado_ambiguo_provider/);
});

test("falha anterior ao início mantém retry limitado existente", async () => {
  const route = await readFile(callbackUrl, "utf8");
  assert.match(route, /failureTransition/);
  assert.match(route, /!sucesso && !ambiguous && transition\.exhausted/);
});

test("callback repetido com o mesmo provider_message_id é idempotente", async () => {
  const route = await readFile(callbackUrl, "utf8");
  assert.match(route, /current\.status === "enviado" && current\.provider_message_id === providerMessageId/);
  assert.match(route, /idempotent: true/);
  assert.match(route, /provider_message_id_conflitante/);
});

test("mesmo telefone em agendamentos diferentes continua permitido", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.doesNotMatch(sql, /unique\s*\(\s*(whatsapp|telefone)\s*\)/i);
  assert.doesNotMatch(sql, /on\s+public\.[^(]+\s*\(\s*(whatsapp|telefone)\s*\)/i);
  assert.match(sql, /provider_message_id/);
});

test("testes e backend não chamam Uazapi", async () => {
  const route = await readFile(callbackUrl, "utf8");
  assert.doesNotMatch(route, /axven\.uazapi\.com|\/send\/text/i);
});
