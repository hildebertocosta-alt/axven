import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isQualifiedClinic, NEW_PATIENTS_LABELS, REVENUE_LABELS } from "../app/lib/clinicAcquisition.ts";

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
  assert.match(source, /window\.fbq\?\.\("track","Lead"\)/);
  assert.match(source, /track\("QualifiedLead"\)/);
});
