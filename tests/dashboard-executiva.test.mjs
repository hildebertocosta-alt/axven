import assert from "node:assert/strict";
import test from "node:test";
import { latestReportPerClient, summarizeLeads, summarizeReports } from "../app/dashboard/executiva/dashboardData.ts";

test("resume funil e faturamento BRL sem inventar conversões", () => {
  const result = summarizeLeads([
    { cliente_id:"a", etapa:"lead", qualificado:false, valor_conversao:null, moeda:null },
    { cliente_id:"a", etapa:"qualificado", qualificado:false, valor_conversao:null, moeda:null },
    { cliente_id:"a", etapa:"fechado", qualificado:false, valor_conversao:"1500", moeda:"BRL" },
    { cliente_id:"a", etapa:"fechado", qualificado:true, valor_conversao:"20", moeda:"USD" },
  ]);
  assert.deepEqual(result, { total:4, qualificados:3, vendas:2, faturamento:1500 });
});

test("usa somente o snapshot mais recente por cliente", () => {
  const latest = latestReportPerClient([
    { cliente_id:"a", investimento:100, leads:10, receita:0, criado_em:"2026-07-01" },
    { cliente_id:"a", investimento:200, leads:10, receita:400, criado_em:"2026-07-02" },
  ]);
  assert.equal(latest.size, 1);
  assert.equal(latest.get("a")?.investimento, 200);
});

test("calcula CPL e ROAS apenas da base reportada", () => {
  assert.deepEqual(summarizeReports([{ cliente_id:"a", investimento:200, leads:10, receita:400, criado_em:"2026-07-02" }]), { investimento:200, cpl:20, roas:2 });
});
