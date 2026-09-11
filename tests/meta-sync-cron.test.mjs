import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { isValidCronAuthorization } from "../app/lib/cronAuth.ts";
import { deriveMetaSyncStatus, isMetaSyncEligible } from "../app/lib/metaSyncPolicy.ts";
import { calculateMetaSyncWindow } from "../app/lib/metaSyncWindow.ts";

const source = async (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("aceita CRON_SECRET válido e rejeita ausente ou inválido", () => {
  assert.equal(isValidCronAuthorization("Bearer segredo-correto", "segredo-correto"), true);
  assert.equal(isValidCronAuthorization(null, "segredo-correto"), false);
  assert.equal(isValidCronAuthorization("Bearer errado", "segredo-correto"), false);
  assert.equal(isValidCronAuthorization("Bearer segredo-correto", undefined), false);
});

test("calcula D-7 até ontem em America/Sao_Paulo e exclui o dia corrente", () => {
  const result = calculateMetaSyncWindow(new Date("2026-09-11T03:30:00.000Z"));
  assert.deepEqual(result, {
    inicio: "2026-09-04",
    fim: "2026-09-10",
    timeZone: "America/Sao_Paulo",
  });
  assert.notEqual(result.fim, "2026-09-11");
});

test("respeita a virada do dia no timezone operacional", () => {
  const result = calculateMetaSyncWindow(new Date("2026-09-11T01:30:00.000Z"));
  assert.equal(result.inicio, "2026-09-03");
  assert.equal(result.fim, "2026-09-09");
});

test("seleção dinâmica exige conta Meta e exclui somente cancelados", () => {
  assert.equal(isMetaSyncEligible({ meta_account_id: "123", status_pagamento: "em_dia" }), true);
  assert.equal(isMetaSyncEligible({ meta_account_id: "123", status_pagamento: "atrasado" }), true);
  assert.equal(isMetaSyncEligible({ meta_account_id: "123", status_pagamento: "cancelado" }), false);
  assert.equal(isMetaSyncEligible({ meta_account_id: null, status_pagamento: "em_dia" }), false);
});

test("deriva status success, partial e failed", () => {
  assert.equal(deriveMetaSyncStatus(9, 0), "success");
  assert.equal(deriveMetaSyncStatus(9, 1), "partial");
  assert.equal(deriveMetaSyncStatus(9, 9), "failed");
});

test("contrato mantém token expirado como falha global e isola erro individual", async () => {
  const code = await source("app/lib/metaInsightsSync.ts");
  assert.match(code, /new MetaSyncGlobalError\("Conexão Meta expirada"/);
  assert.match(code, /new MetaSyncGlobalError\("Conexão Meta inválida"/);
  assert.match(code, /graph\.facebook\.com\/\$\{META_GRAPH_VERSION\}\/me/);
  assert.match(code, /for \(const client[\s\S]*?try \{[\s\S]*?syncClient[\s\S]*?catch \{/);
  assert.match(code, /Falha sanitizada ao sincronizar cliente/);
});

test("trava concorrência por conflito atômico e recupera run abandonado", async () => {
  const [code, migration] = await Promise.all([
    source("app/lib/metaInsightsSync.ts"),
    source("supabase/migrations/20260911123000_create_meta_ads_sync_audit.sql"),
  ]);
  assert.match(code, /runError\?\.code === "23505"/);
  assert.match(code, /STALE_RUN_MS = 2 \* 60 \* 60 \* 1000/);
  assert.match(migration, /unique index[\s\S]*periodo_inicio, periodo_fim[\s\S]*where status = 'running'/i);
});

test("upsert idempotente mantém a chave homologada", async () => {
  const code = await source("app/lib/metaInsightsSync.ts");
  assert.match(code, /onConflict: "cliente_id,meta_account_id,metric_date,ad_id"/);
});

test("endpoint manual POST permanece e reutiliza o mesmo núcleo", async () => {
  const [route, proxy] = await Promise.all([
    source("app/api/relatorios/meta-sync/route.ts"),
    source("proxy.ts"),
  ]);
  assert.match(route, /export async function POST/);
  assert.match(route, /syncMetaInsights\(/);
  assert.match(route, /trigger: "manual"/);
  assert.doesNotMatch(proxy, /PUBLIC_API_PREFIXES[^\n]*\/api\/relatorios\//);
});

test("rota Cron é pública no proxy, mas falha fechada no próprio handler", async () => {
  const [route, proxy] = await Promise.all([
    source("app/api/cron/meta-sync/route.ts"),
    source("proxy.ts"),
  ]);
  assert.match(proxy, /"\/api\/cron\/"/);
  assert.match(route, /isValidCronAuthorization/);
  assert.match(route, /status: 401/);
});
