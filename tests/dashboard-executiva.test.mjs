import assert from "node:assert/strict";
import test from "node:test";
import { filterCrmByCampaignName, summarizeCrm, summarizeMeta } from "../app/dashboard/executiva/dashboardData.ts";

test("Leads Meta soma exclusivamente action_type lead", () => {
  const result = summarizeMeta([
    { cliente_id: "a", campaign_id: "c", campaign_name: "Campanha", spend: 100, impressions: 1000, reach: 800, clicks: 50, leads: 10, lead_action_type: "lead", currency: "BRL" },
    { cliente_id: "a", campaign_id: "c", campaign_name: "Campanha", spend: 50, impressions: 500, reach: 400, clicks: 25, leads: 7, lead_action_type: "onsite_conversion.messaging_conversation_started_7d", currency: "BRL" },
  ]);
  assert.equal(result.metaLeads, 10);
  assert.equal(result.conversations, 7);
  assert.equal(result.spend, 150);
  assert.equal(result.cpl, 15);
  assert.equal(result.ctr, 5);
  assert.equal(result.cpc, 2);
  assert.equal(result.cpm, 100);
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
