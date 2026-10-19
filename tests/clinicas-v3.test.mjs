import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CLINICAS_V3_NOT_COLLECTED, isQualifiedClinic } from "../app/lib/clinicAcquisition.ts";

const route = readFileSync(new URL("../app/api/aquisicao/clinicas/route.ts", import.meta.url), "utf8");
const form = readFileSync(new URL("../app/clinicas/LeadForm.tsx", import.meta.url), "utf8");
const page = readFileSync(new URL("../app/clinicas/page.tsx", import.meta.url), "utf8");

test("/analise continua com o corte de R$ 35 mil", () => {
  assert.equal(isQualifiedClinic("34"), false);
  assert.equal(isQualifiedClinic("60"), true);
});

test("/clinicas V3 qualifica sem o corte de faturamento", () => {
  assert.equal(CLINICAS_V3_NOT_COLLECTED, "nao_coletado_v3");
  assert.match(route, /const isClinicasV3 = landingPage === "\/clinicas"/);
  assert.match(route, /const qualificado = isClinicasV3 \|\| isQualifiedClinic\(revenueKey\)/);
});

test("/clinicas V3 aceita lead sem verba, desafio e pacientes (grava nao_coletado_v3)", () => {
  assert.match(route, /ads = text\(body\.ads, 100\) \|\| \(isClinicasV3 \? CLINICAS_V3_NOT_COLLECTED : ""\)/);
  assert.match(route, /challenge = text\(body\.challenge, 160\) \|\| \(isClinicasV3 \? CLINICAS_V3_NOT_COLLECTED : ""\)/);
  assert.match(route, /novos_pacientes_faixa: NEW_PATIENTS_LABELS\[newPatientsKey\] \?\? CLINICAS_V3_NOT_COLLECTED/);
});

test("formulário de /clinicas tem só 4 campos e preserva tracking", () => {
  const names = [...form.matchAll(/<(?:input|select) name="([a-z_]+)"/g)].map((m) => m[1]);
  assert.deepEqual(names, ["name", "whatsapp", "instagram", "revenue"]);
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "campaign_id", "adset_id", "ad_id"]) assert.match(form, new RegExp(`"${key}"`));
});

test("Lead deduplica com o servidor e não dispara em retry", () => {
  assert.match(form, /if\(shouldTrackMetaSubmission\(result\)\)/);
  assert.match(form, /trackMeta\("Lead",\{[^}]*\},false,result\.meta_event_id\)/);
});

test("página tem WhatsApp, preço a partir de R$ 990 e não promete edição de criativo", () => {
  assert.match(form, /WHATSAPP_AXVEN = "5581995788220"/);
  assert.match(page, /href=\{WHATSAPP_HREF\} onClick=\{onWhatsappClick\}/);
  assert.match(page, /R\$ 990/);
  assert.doesNotMatch(page, /35 mil/);
  assert.doesNotMatch(page, /design e adaptação/);
});
