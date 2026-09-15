import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { filterAxvenByAttribution, filterCrmByCampaignName, safeRatio, summarizeAxvenCrm, summarizeCrm, summarizeMeta } from "../app/dashboard/executiva/dashboardData.ts";

const metaRow = (overrides = {}) => ({ cliente_id: "a", campaign_id: "c", campaign_name: "Campanha", adset_id: "s", adset_name: "Conjunto", ad_id: "ad", ad_name: "Anúncio", spend: 0, impressions: 0, reach: 0, clicks: 0, leads: 0, lead_action_type: "lead", currency: "BRL", ...overrides });
const page = readFileSync(new URL("../app/dashboard/executiva/page.tsx", import.meta.url), "utf8");

test("Leads Meta soma exclusivamente action_type lead", () => {
  const result = summarizeMeta([
    metaRow({ spend: 100, impressions: 1000, reach: 800, clicks: 50, leads: 10 }),
    metaRow({ spend: 50, impressions: 500, reach: 400, clicks: 25, leads: 7, lead_action_type: "onsite_conversion.messaging_conversation_started_7d" }),
  ]);
  assert.equal(result.metaLeads, 10);
  assert.equal(result.conversations, 7);
  assert.equal(result.spend, 150);
  assert.equal(result.cpl, 15);
  assert.equal(result.ctr, 5);
  assert.equal(result.cpc, 2);
  assert.equal(result.cpm, 100);
});

test("funil Axven preserva evidência real e não infere proposta a partir de venda", () => {
  const rows = [
    { id: "1", campaign_id: "c1", adset_id: "s", ad_id: "a1", etapa: "lead", qualificado: false, agendado_em: null, venda_em: null, valor_venda: null, moeda: null },
    { id: "2", campaign_id: "c1", adset_id: "s", ad_id: "a1", etapa: "fechado", qualificado: true, agendado_em: "2026-09-10T18:00:00Z", venda_em: "2026-09-12T12:00:00Z", valor_venda: 2500, moeda: "BRL" },
    { id: "3", campaign_id: "c2", adset_id: "s2", ad_id: "a2", etapa: "lead", qualificado: false, agendado_em: null, venda_em: null, valor_venda: null, moeda: null },
  ];
  const result = summarizeAxvenCrm(rows, [{ lead_id: "3", status: "agendado" }], [{ lead_id: "1", etapa_nova: "proposta_enviada" }]);
  assert.deepEqual(result, { crmLeads: 3, qualified: 1, scheduled: 2, proposals: 1, sales: 1, revenue: 2500 });
});

test("correlação Axven usa IDs exatos de campanha e anúncio", () => {
  const rows = [
    { id: "1", campaign_id: "c1", adset_id: "s", ad_id: "a1", etapa: "lead", qualificado: false, agendado_em: null, venda_em: null, valor_venda: null, moeda: null },
    { id: "2", campaign_id: "c1", adset_id: "s", ad_id: "a2", etapa: "lead", qualificado: false, agendado_em: null, venda_em: null, valor_venda: null, moeda: null },
  ];
  assert.equal(filterAxvenByAttribution(rows, "c1", "a1").length, 1);
  assert.equal(filterAxvenByAttribution(rows, "missing").length, 0);
  assert.equal(safeRatio(10, 0), null);
});

test("Dashboard seleciona a fonte própria da Axven e mantém as divisões executivas", () => {
  assert.match(page, /AXVEN_CLIENT_ID/);
  assert.match(page, /from\("aquisicao_axven_leads"\)/);
  assert.match(page, /from\("aquisicao_axven_agendamentos"\)/);
  assert.match(page, /from\("aquisicao_axven_lead_eventos"\)/);
  assert.match(page, /Mídia Meta/);
  assert.match(page, /Comercial CRM/);
  assert.match(page, /Aquisição por anúncio/);
});

test("funil CRM permanece separado da conversao Meta", () => {
  const result = summarizeCrm([
    { cliente_id: "a", etapa: "lead", qualificado: false, valor_conversao: null, moeda: null, campanha: "C1" },
    { cliente_id: "a", etapa: "qualificado", qualificado: false, valor_conversao: null, moeda: null, campanha: "C1" },
    { cliente_id: "a", etapa: "fechado", qualificado: true, valor_conversao: "2500", moeda: "BRL", campanha: "C2" },
    { cliente_id: "a", etapa: "fechado", qualificado: true, valor_conversao: "100", moeda: "USD", campanha: "C2" },
  ]);
  assert.deepEqual(result, { crmLeads: 4, qualified: 3, sales: 2, revenue: 2500 });
});

test("campanha do CRM so e correlacionada por nome exato", () => {
  const rows = [
    { cliente_id: "a", etapa: "lead", qualificado: false, valor_conversao: null, moeda: null, campanha: "Campanha A" },
    { cliente_id: "a", etapa: "lead", qualificado: false, valor_conversao: null, moeda: null, campanha: "Campanha B" },
  ];
  assert.equal(filterCrmByCampaignName(rows, "Campanha A").length, 1);
  assert.equal(filterCrmByCampaignName(rows, null).length, 2);
});
