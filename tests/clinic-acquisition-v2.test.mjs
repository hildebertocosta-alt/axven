import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isQualifiedClinic, NEW_PATIENTS_LABELS, REVENUE_LABELS } from "../app/lib/clinicAcquisition.ts";
import { buildMetaLeadEventId, shouldTrackMetaSubmission } from "../app/lib/metaLeadEvent.ts";

test("mantém as faixas de faturamento homologadas", () => { assert.equal(REVENUE_LABELS["60"], "R$ 35 mil a R$ 60 mil"); assert.equal(Object.keys(REVENUE_LABELS).length, 6); });
test("qualificação mantém o corte atual de R$ 35 mil", () => { assert.equal(isQualifiedClinic("20"), false); assert.equal(isQualifiedClinic("34"), false); assert.equal(isQualifiedClinic("60"), true); assert.equal(isQualifiedClinic("301"), true); });
test("novos pacientes aceita somente as opções da V2", () => { assert.deepEqual(Object.keys(NEW_PATIENTS_LABELS), ["0-5", "6-10", "11-20", "21-40", "41-60", "61+"]); });

test("/analise contém exatamente as sete perguntas da V2 e preserva tracking", () => {
  const source = readFileSync(new URL("../app/analise/DiagnosticForm.tsx", import.meta.url), "utf8");
  const start = source.indexOf("const questions = [");
  const questionBlock = source.slice(start, source.indexOf("] as const;", start) + 1);
  assert.equal((questionBlock.match(/\{ key:/g) ?? []).length, 7);
  for (const key of ["name", "whatsapp", "instagram", "revenue", "ads", "challenge", "new_patients"]) assert.match(questionBlock, new RegExp(`key:\"${key}\"`));
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "campaign_id", "adset_id", "ad_id"]) assert.match(source, new RegExp(`\"${key}\"`));
  assert.match(source, /window\.fbq\?\.\("track","Lead",\{\},\{eventID:data\.meta_event_id\}\)/);
  assert.match(source, /track\("QualifiedLead"\)/);
  assert.match(source, /if\(shouldTrackMetaSubmission\(data\)\)/);
});

test("gera event ID estavel no formato esperado", () => {
  const uuid = "123e4567-e89b-42d3-a456-426614174000";
  assert.equal(buildMetaLeadEventId(uuid), `axven_lead_${uuid}`);
});

test("retry idempotente nao dispara Lead nem QualifiedLead", () => {
  const meta_event_id = "axven_lead_123e4567-e89b-42d3-a456-426614174000";
  assert.equal(shouldTrackMetaSubmission({ idempotent: false, meta_event_id }), true);
  assert.equal(shouldTrackMetaSubmission({ idempotent: true, meta_event_id }), false);
  assert.equal(shouldTrackMetaSubmission({ idempotent: false, meta_event_id: "invalido" }), false);
});

test("endpoint gera event ID server-side e o devolve nos caminhos idempotentes", () => {
  const source = readFileSync(new URL("../app/api/aquisicao/clinicas/route.ts", import.meta.url), "utf8");
  assert.match(source, /buildMetaLeadEventId\(randomUUID\(\)\)/);
  assert.match(source, /meta_event_id: metaEventId/);
  assert.equal((source.match(/meta_event_id: existing\.meta_event_id/g) ?? []).length, 2);
  assert.match(source, /idempotent: false/);
});

test("migration e estritamente aditiva, nullable e usa indice unique parcial", () => {
  const source = readFileSync(new URL("../supabase/migrations/20260911170000_add_meta_event_id_to_aquisicao_axven_leads.sql", import.meta.url), "utf8");
  assert.match(source, /add column if not exists meta_event_id text/i);
  assert.match(source, /create unique index if not exists aquisicao_axven_leads_meta_event_id_unique/i);
  assert.match(source, /where meta_event_id is not null/i);
  assert.doesNotMatch(source, /\b(drop|truncate|delete|update)\b/i);
  assert.doesNotMatch(source, /meta_event_id\s+text\s+not null/i);
});
