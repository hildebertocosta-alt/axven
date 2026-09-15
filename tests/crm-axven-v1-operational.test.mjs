import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../supabase/migrations/20260915100000_create_aquisicao_axven_lead_eventos.sql", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/api/crm/axven/leads/atualizar-etapa/route.ts", import.meta.url), "utf8");
const board = readFileSync(new URL("../app/pipeline/LeadsBoard.tsx", import.meta.url), "utf8");
const page = readFileSync(new URL("../app/pipeline/page.tsx", import.meta.url), "utf8");

test("migration cria timeline aditiva, privada e indexada", () => {
  assert.match(migration, /create table if not exists public\.aquisicao_axven_lead_eventos/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on table[\s\S]*from public, anon, authenticated/i);
  assert.match(migration, /lead_id, criado_em desc/i);
  assert.doesNotMatch(migration, /^\s*(drop|truncate|delete)\b/im);
});

test("mudança de etapa e timeline são atômicas na mesma RPC", () => {
  assert.match(migration, /for update/i);
  assert.match(migration, /update public\.aquisicao_axven_leads[\s\S]*insert into public\.aquisicao_axven_lead_eventos/i);
  assert.match(route, /\.rpc\("atualizar_etapa_aquisicao_axven_lead_v1"/);
  assert.doesNotMatch(route, /\.from\("aquisicao_axven_leads"\)\.update/);
});

test("invariantes preservam fatos históricos", () => {
  assert.match(migration, /else qualificado/);
  assert.match(migration, /else agendado_em/);
  assert.match(migration, /else valor_venda/);
  assert.match(migration, /else venda_em/);
  assert.match(migration, /agendamento_ausente/);
});

test("fechamento e etapas finais exigem dados", () => {
  assert.match(migration, /motivo_obrigatorio/);
  assert.match(migration, /valor_venda_obrigatorio/);
  assert.match(migration, /data_venda_obrigatoria/);
  assert.match(route, /valor, moeda e data da venda são obrigatórios/);
});

test("handler exige sessão e sanitiza falhas", () => {
  assert.match(route, /verifySessionToken/);
  assert.match(route, /não foi possível atualizar a etapa/);
  assert.doesNotMatch(route, /error\.message\s*\}/);
});

test("pipeline inclui detalhes, timeline, busca e filtros", () => {
  assert.match(page, /aquisicao_axven_lead_eventos/);
  assert.match(page, /aquisicao_axven_agendamentos/);
  for (const field of ["instagram","faturamento_faixa","investimento_ads_faixa","desafio_principal","novos_pacientes_faixa","utm_medium","utm_content","fbclid"]) assert.match(page, new RegExp(field));
  assert.match(board, /Detalhes do lead/);
  assert.match(board, /Timeline/);
  assert.match(board, /Buscar nome ou WhatsApp/);
  assert.match(board, /Todas as origens/);
  assert.match(board, /Todas as campanhas/);
});

test("select e o unico mecanismo visual de mudanca de etapa", () => {
  assert.doesNotMatch(board, /DndContext|DragOverlay|useSortable|useDroppable|dragEnd/);
  assert.match(board, /aria-label={`Alterar etapa de \$\{lead\.nome\|\|"lead"\}`}/);
  assert.match(board, /if\(etapa!==lead\.etapa\)onMove\(lead,etapa\)/);
  assert.match(board, /if\(etapa==="fechado"\|\|etapa==="nao_fechou"\|\|etapa==="desqualificado"\)\{setPending/);
});

test("escopo não toca Outbox nem CRMs paralelos", () => {
  for (const source of [migration, route]) {
    assert.doesNotMatch(source, /aquisicao_axven_whatsapp_outbox/);
    assert.doesNotMatch(source, /leads_comerciais/);
    assert.doesNotMatch(source, /public\.leads(?:\W|$)/);
  }
});
