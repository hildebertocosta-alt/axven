import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  failureTransition,
  OUTBOX_MAX_ATTEMPTS,
  OUTBOX_PROCESSING_LEASE_MINUTES,
  sanitizeOutboxError,
} from "../app/lib/acquisitionWhatsappOutbox.ts";

const migrationUrl = new URL("../supabase/migrations/20260914170000_harden_aquisicao_whatsapp_outbox.sql", import.meta.url);

test("callback sanitiza erros e limita tentativas", () => {
  assert.equal(sanitizeOutboxError(" token=segredo https://host/path "), "falha_no_envio");
  assert.equal(sanitizeOutboxError("uazapi_envio_falhou"), "uazapi_envio_falhou");
  assert.equal(failureTransition(OUTBOX_MAX_ATTEMPTS).exhausted, true);
  assert.equal(failureTransition(OUTBOX_MAX_ATTEMPTS - 1).exhausted, false);
});

test("claim é atômico, concorrente e possui lease", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /for update of o skip locked/i);
  assert.match(sql, new RegExp(`interval '${OUTBOX_PROCESSING_LEASE_MINUTES} minutes'`, "i"));
  assert.match(sql, /tentativas < 5/i);
});

test("reunião futura permanece elegível", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /a\.status = 'agendado'/i);
  assert.match(sql, /a\.inicio > now\(\)/i);
  assert.match(sql, /o\.disponivel_em <= now\(\)/i);
});

test("processando abandonado volta ao claim sem loop infinito", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /o\.status = 'processando'[\s\S]*o\.atualizado_em <= now\(\) - interval '10 minutes'/i);
  assert.match(sql, /o\.tentativas < 5/i);
});

test("agendamento passado é cancelado antes do claim e nunca fica elegível", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /set status = 'cancelado'[\s\S]*a\.inicio <= now\(\)/i);
  assert.match(sql, /a\.inicio > now\(\)/i);
  assert.match(sql, /agendamento_expirado/i);
});

test("RPC privilegiada não é pública", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /revoke all .* from public, anon, authenticated/i);
  assert.match(sql, /grant execute .* to service_role/i);
  assert.doesNotMatch(sql, /\b(drop|truncate|delete)\b/i);
});

test("endpoint usa a RPC endurecida e callback é idempotente no sucesso", async () => {
  const claim = await readFile(new URL("../app/api/webhooks/aquisicao/whatsapp/pendentes/route.ts", import.meta.url), "utf8");
  const callback = await readFile(new URL("../app/api/webhooks/aquisicao/whatsapp/enviado/route.ts", import.meta.url), "utf8");
  assert.match(claim, /claim_aquisicao_axven_whatsapp_outbox_v1/);
  assert.match(callback, /current\.status === "enviado"/);
  assert.match(callback, /idempotent: true/);
  assert.match(callback, /retryExhausted/);
});

test("sucesso preenche enviado_em e falha usa retry limitado", async () => {
  const callback = await readFile(new URL("../app/api/webhooks/aquisicao/whatsapp/enviado/route.ts", import.meta.url), "utf8");
  assert.match(callback, /status: "enviado", enviado_em: agora\.toISOString\(\)/);
  assert.match(callback, /failureTransition/);
});

test("Preview antigo não permanece hardcoded nos endpoints", async () => {
  const sources = await Promise.all([
    readFile(new URL("../app/api/webhooks/aquisicao/whatsapp/pendentes/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/webhooks/aquisicao/whatsapp/enviado/route.ts", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(sources.join("\n"), /axven-p3g798qjp-hildebertocosta-alts-projects\.vercel\.app/i);
});

test("testes não chamam Uazapi e a aplicação não contém envio direto", async () => {
  const sources = await Promise.all([
    readFile(new URL("../app/api/webhooks/aquisicao/whatsapp/pendentes/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/webhooks/aquisicao/whatsapp/enviado/route.ts", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(sources.join("\n"), /axven\.uazapi\.com|\/send\/text/i);
});

test("endpoints preservam autenticação server-side e no-store", async () => {
  const files = await Promise.all([
    readFile(new URL("../app/api/webhooks/aquisicao/whatsapp/pendentes/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/webhooks/aquisicao/whatsapp/enviado/route.ts", import.meta.url), "utf8"),
  ]);
  assert.ok(files.every((source) => source.includes("validateWebhookSecret(req)")));
  assert.match(files[0], /Cache-Control": "no-store/);
});
