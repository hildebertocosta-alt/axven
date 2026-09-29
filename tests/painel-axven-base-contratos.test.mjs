import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const ler = (caminho) => readFileSync(join(raiz, caminho), "utf8");

const rotas = {
  webhook: { src: ler("app/api/webhooks/leads/etapa/route.ts"), origem: "sistema" },
  interno: { src: ler("app/api/clientes/[clienteId]/crm/leads/[leadId]/route.ts"), origem: "axven" },
  fechar: { src: ler("app/api/crm/leads/[id]/fechar/route.ts"), origem: "portal" },
};

test("toda rota que muda etapa usa a RPC que grava o histórico", () => {
  for (const [nome, { src }] of Object.entries(rotas)) {
    assert.match(src, /rpc\(\s*"atualizar_etapa_lead_v1"/, `${nome}: não usa a RPC`);
    assert.match(src, /interpretarMudancaEtapa/, `${nome}: não valida pelo módulo comum`);
    assert.match(src, /traduzirErroEtapa/, `${nome}: não traduz o erro do banco`);
    assert.doesNotMatch(src, /update\(\{\s*etapa/, `${nome}: ainda grava etapa direto`);
  }
});

test("cada rota informa a própria origem", () => {
  for (const [nome, { src, origem }] of Object.entries(rotas)) {
    assert.match(src, new RegExp(`"${origem}"`), `${nome}: origem ${origem} ausente`);
  }
});

test("nenhuma rota mantém a lista fixa das etapas antigas", () => {
  for (const [nome, { src }] of Object.entries(rotas)) {
    assert.doesNotMatch(src, /"proposta_enviada"|"nao_fechou"/, `${nome}: lista antiga ainda presente`);
  }
  assert.match(ler("app/api/crm/disparos/route.ts"), /\["lead", "qualificado", "oportunidade", "fechado", "perdido"\]/);
});
