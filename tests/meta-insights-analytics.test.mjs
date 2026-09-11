import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDailyAdInsight, resolveMetaLeads } from "../app/lib/metaInsightsData.ts";
import { readFileSync } from "node:fs";

test("normaliza uma linha diária de anúncio preservando IDs e metadados", () => {
  const row = normalizeDailyAdInsight({ date_start: "2026-09-10", campaign_id: "c1", campaign_name: "Campanha", adset_id: "s1", adset_name: "Conjunto", ad_id: "a1", ad_name: "Anúncio", spend: "12.34", impressions: "1000", reach: "800", clicks: "25", ctr: "2.5", cpc: "0.4936", cpm: "12.34", actions: [{ action_type: "lead", value: "3" }] }, { cliente_id: "cliente", meta_account_id: "conta", currency: "BRL", account_timezone: "America/Sao_Paulo", synced_at: "2026-09-10T12:00:00Z" });
  assert.deepEqual(row && { date: row.metric_date, campaign: row.campaign_id, adset: row.adset_id, ad: row.ad_id, spend: row.spend, leads: row.leads, currency: row.currency }, { date: "2026-09-10", campaign: "c1", adset: "s1", ad: "a1", spend: 12.34, leads: 3, currency: "BRL" });
});

test("usa a prioridade existente para Lead sem somar action types sobrepostos", () => {
  assert.deepEqual(resolveMetaLeads([{ action_type: "lead", value: "4" }, { action_type: "onsite_conversion.lead_grouped", value: "7" }]), { leads: 4, lead_action_type: "lead" });
  assert.deepEqual(resolveMetaLeads([{ action_type: "offsite_conversion.fb_pixel_lead", value: "2" }]), { leads: 2, lead_action_type: "offsite_conversion.fb_pixel_lead" });
});

test("rejeita linha sem IDs hierárquicos necessários", () => {
  assert.equal(normalizeDailyAdInsight({ date_start: "2026-09-10", campaign_id: "c1", adset_id: "s1" }, { cliente_id: "cliente", meta_account_id: "conta", currency: "BRL", account_timezone: "UTC", synced_at: "now" }), null);
});

test("endpoint de diagnóstico solicita Purchase Value e ROAS sem alterar o sync", () => {
  const route = readFileSync(new URL("../app/api/relatorios/meta-insights/route.ts", import.meta.url), "utf8");
  assert.match(route, /"action_values"/);
  assert.match(route, /"purchase_roas"/);
  assert.match(route, /"website_purchase_roas"/);

  const sync = readFileSync(new URL("../app/lib/metaInsightsSync.ts", import.meta.url), "utf8");
  assert.doesNotMatch(sync, /action_values|purchase_roas|website_purchase_roas/);
});
