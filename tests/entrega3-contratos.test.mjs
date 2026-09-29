import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const ler = (c) => readFileSync(join(raiz, c), "utf8");

test("envio da venda ao Meta: só servidor, idempotente, não derruba a venda e ignora leads de teste", () => {
  const src = ler("app/lib/metaVendaServidor.ts");
  assert.match(src, /import "server-only"/);
  assert.match(src, /from\("cliente_segredos"\)/);
  assert.match(src, /from\("capi_eventos"\)/);
  assert.match(src, /"enviado"/);
  assert.match(src, /plataforma === "teste"/);
  assert.match(src, /capi_origem !== "axven"/);
  assert.match(src, /catch/);
  assert.doesNotMatch(src, /\bthrow\b/);
});

test("as três rotas que registram venda chamam o envio ao Meta", () => {
  for (const rota of [
    "app/api/crm/leads/[id]/fechar/route.ts",
    "app/api/clientes/[clienteId]/crm/leads/[leadId]/route.ts",
    "app/api/webhooks/leads/etapa/route.ts",
  ]) {
    assert.match(ler(rota), /enviarVendaAoMeta\(/, rota);
  }
});
