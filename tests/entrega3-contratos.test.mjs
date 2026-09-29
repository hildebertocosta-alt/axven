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

test("cron do lembrete: autenticado, trava diária, só atendentes com lembrete e só quando há parados", () => {
  const src = ler("app/api/cron/lembrete-parados/route.ts");
  assert.match(src, /isValidCronAuthorization/);
  assert.match(src, /\.eq\("recebe_lembrete", true\)/);
  assert.match(src, /from\("notificacoes_whatsapp"\)/);
  assert.match(src, /23505/);
  assert.match(src, /UAZAPI_AXVEN_TOKEN/);
  assert.match(src, /textoLembrete\(/);
  assert.match(src, /parados === 0/);
  assert.match(src, /plataforma\.is\.null,plataforma\.neq\.teste/);
  const cron = JSON.parse(ler("vercel.json"));
  assert.ok(cron.crons.some((c) => c.path === "/api/cron/lembrete-parados" && c.schedule === "30 11 * * *"));
});

test("link do lembrete abre o painel já filtrado nos parados", () => {
  assert.match(ler("app/crm/[slug]/page.tsx"), /parados === "1"/);
  assert.match(ler("app/crm/[slug]/KanbanBoard.tsx"), /soParadosInicial/);
});
