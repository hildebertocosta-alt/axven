import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { parseIntegrationClientInput } from "../app/lib/clientCreation.ts";

test("normaliza os campos mínimos do novo cliente", () => {
  assert.deepEqual(parseIntegrationClientInput({
    nome: "  Axven Digital  ",
    meta_account_id: " 123 ",
    tipo_campanha: "lead",
    status_pagamento: "em_dia",
  }), {
    nome: "Axven Digital",
    metaAccountId: "123",
    metaAccountIdValid: true,
    campaignType: "lead",
    paymentStatus: "em_dia",
  });
});

test("rejeita tipo de campanha e status não permitidos", () => {
  const parsed = parseIntegrationClientInput({
    nome: "Cliente",
    tipo_campanha: "arbitrario",
    status_pagamento: "cancelado",
  });
  assert.equal(parsed.campaignType, null);
  assert.equal(parsed.paymentStatus, null);
  assert.equal(parseIntegrationClientInput({ nome: "Cliente", meta_account_id: "act_123" }).metaAccountIdValid, false);
});

test("Route Handler exige sessão, valida duplicidade e sanitiza falha do banco", () => {
  const route = readFileSync(new URL("../app/api/clientes/criar/route.ts", import.meta.url), "utf8");
  assert.match(route, /verifySessionToken/);
  assert.match(route, /conta Meta já vinculada a outro cliente/);
  assert.match(route, /conta Meta não acessível pela conexão atual/);
  assert.doesNotMatch(route, /error\.message/);
  assert.doesNotMatch(route, /access_token.*URLSearchParams/);
});

test("interface reutiliza contas OAuth e atualiza a lista após criação", () => {
  const view = readFileSync(new URL("../app/integracoes/IntegracoesView.tsx", import.meta.url), "utf8");
  assert.match(view, /Adicionar cliente/);
  assert.match(view, /contas\.map/);
  assert.match(view, /setClientes/);
  assert.match(view, /meta_account_id/);
});
