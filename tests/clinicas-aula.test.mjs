import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { AULA_CLINICAS_LANDING_ID, AULA_CLINICAS_LANDING_PAGE, AULA_CLINICAS_NOT_COLLECTED, isValidBrazilMobile } from "../app/lib/clinicAcquisition.ts";

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8");
const route = ler("../app/api/aquisicao/clinicas/route.ts");
const landing = ler("../app/clinicas/aula/AulaLanding.tsx");
const config = ler("../app/clinicas/aula/config.ts");
const pagina = ler("../app/clinicas/aula/page.tsx");
const proxy = ler("../proxy.ts");

test("identificadores da aula", () => {
  assert.equal(AULA_CLINICAS_LANDING_ID, "clinicas-aula");
  assert.equal(AULA_CLINICAS_LANDING_PAGE, "/clinicas/aula");
  assert.equal(AULA_CLINICAS_NOT_COLLECTED, "nao_coletado_aula");
});

test("valida celular BR com DDD e 9", () => {
  assert.equal(isValidBrazilMobile("81999999999"), true);
  assert.equal(isValidBrazilMobile("8199999999"), false);
  assert.equal(isValidBrazilMobile("81899999999"), false);
  assert.equal(isValidBrazilMobile("01999999999"), false);
});

test("API desvia a aula antes da validação da /clinicas e não qualifica o lead", () => {
  const desvio = route.indexOf("=== AULA_CLINICAS_LANDING_ID) return createAulaLead(req, body)");
  assert.ok(desvio > 0 && desvio < route.indexOf("const landingPage = resolveLandingPage(body.origin_url)"));
  assert.match(route, /landing_page: AULA_CLINICAS_LANDING_PAGE, nome, clinica, whatsapp: `55\$\{whatsappDigits\}`, instagram: null/);
  assert.match(route, /qualificado: false, motivo_desqualificacao: null, etapa: "lead"/);
  assert.match(route, /meta_event_id: buildMetaLeadEventId\(randomUUID\(\)\)/);
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "campaign_id", "adset_id", "ad_id"]) assert.ok(route.split(`${k}: nullable(body.${k}`).length >= 3, k);
});

test("formulário tem 3 campos, manda a landing e o Lead com eventID", () => {
  const nomes = [...landing.matchAll(/<input id="[^"]+" name="([a-z_]+)"/g)].map((m) => m[1]);
  assert.deepEqual(nomes, ["name", "whatsapp", "clinic"]);
  assert.match(landing, /landing: AULA_CLINICAS_LANDING_ID/);
  assert.match(landing, /\.\.\.captureTracking\(\)/);
  assert.match(landing, /if \(shouldTrackMetaSubmission\(resultado\)\) trackMeta\("Lead", \{[^}]*\}, false, resultado\.meta_event_id\)/);
  assert.match(landing, /Ao se inscrever, você aceita receber no WhatsApp as mensagens sobre a aula\. Você pode sair quando quiser\./);
});

test("link da comunidade vem de uma configuração só e tem texto de espera", () => {
  assert.match(config, /process\.env\.NEXT_PUBLIC_AULA_CLINICAS_COMUNIDADE_URL \|\| COMUNIDADE_URL_PADRAO/);
  assert.match(landing, /Você vai receber o link da comunidade no seu WhatsApp\./);
  assert.match(config, /dates: "20261118T193000\/20261118T204500"/);
  assert.match(config, /ctz: "America\/Recife"/);
  assert.doesNotMatch(landing + config, /meet\.google/i);
});

test("compliance: sem nome de cliente, promessa ou 'agência de tráfego'", () => {
  const textos = landing + config + pagina;
  assert.doesNotMatch(textos, /OBELE/i);
  assert.doesNotMatch(textos, /ag[êe]ncia de tr[áa]fego/i);
  assert.doesNotMatch(textos, /antes e depois|antes\/depois|garantimos|garantido/i);
  assert.match(landing, /Dados de um cliente da Axven, sem o nome\. Não é promessa de resultado\./);
});

test("metadados próprios e rota pública", () => {
  assert.match(pagina, /"Aula ao vivo para clínicas de estética \| Axven Digital"/);
  assert.match(pagina, /\/clinicas\/aula-compartilhar\.png/);
  assert.match(proxy, /if \(pathname === "\/clinicas\/aula" \|\| pathname === "\/clinicas\/aula\/comunidade"\) return true;/);
});
