import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const ler = (caminho) => readFileSync(join(raiz, caminho), "utf8");

test("portal navega por abas no topo (o menu lateral some no celular) e só tem Leads e Resultado", () => {
  const abas = ler("app/crm/[slug]/PortalTabs.tsx");
  assert.match(abas, /"leads" \| "resultado"/);
  assert.match(abas, /\/resultado/);
  assert.doesNotMatch(abas, /conversas|disparo/i);
  const nav = ler("app/crm/[slug]/portalNav.ts");
  assert.doesNotMatch(nav, /conversas|disparo/i);
  const leads = ler("app/crm/[slug]/page.tsx");
  assert.match(leads, /<PortalTabs slug=\{slug\} active="leads" \/>/);
  assert.match(leads, /portalSidebarItems\(slug\)/);
  assert.match(leads, /etapa_alterada_em/);
  assert.match(leads, /anuncio/);
});

test("aba Leads tem lista para celular com botões de mover, filtros e dias parado", () => {
  const kanban = ler("app/crm/[slug]/KanbanBoard.tsx");
  assert.match(kanban, /<LeadsLista/);
  assert.match(kanban, /hidden md:block/);
  assert.match(kanban, /filtrarLeads\(/);
  assert.match(kanban, /function moverPara\(/);
  const lista = ler("app/crm/[slug]/LeadsLista.tsx");
  assert.match(lista, /Mover para/);
  assert.match(lista, /md:hidden/);
  assert.match(lista, /diasParado\(/);
});
