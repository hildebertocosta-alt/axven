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

test("aba Resultado lê só o cliente do slug e usa os cálculos testados", () => {
  const resultado = ler("app/crm/[slug]/resultado/page.tsx");
  assert.match(resultado, /\.eq\("slug", slug\)/);
  for (const fn of ["resolverPeriodo(", "resumoResultado(", "funil(", "rankingAnuncios("]) assert.ok(resultado.includes(fn), fn);
  assert.match(resultado, /from\("meta_ads_insights_daily"\)/);
  assert.match(resultado, /from\("lead_etapa_eventos"\)/);
  assert.match(resultado, /<PortalTabs slug=\{slug\} active="resultado" \/>/);
  assert.match(resultado, /leads que chegaram no período/i);
});

test("Conversas e Disparo saíram do portal (redirecionam para Leads)", () => {
  for (const pagina of ["app/crm/[slug]/conversas/page.tsx", "app/crm/[slug]/disparo/page.tsx"]) {
    const src = ler(pagina);
    assert.match(src, /redirect\(`\/crm\/\$\{slug\}`\)/);
  }
});

test("portal esconde leads de teste, pagina as consultas e mostra o ranking inteiro", () => {
  const resultado = ler("app/crm/[slug]/resultado/page.tsx");
  assert.match(resultado, /semLeadsDeTeste\(/);
  assert.doesNotMatch(resultado, /\.limit\(/, "limit não passa do teto de 1000 linhas do Supabase: paginar com range");
  assert.match(resultado, /\.range\(/);
  assert.doesNotMatch(resultado, /\.slice\(0, 10\)/, "ranking não pode esconder anúncios com gasto e sem lead");
  const leads = ler("app/crm/[slug]/page.tsx");
  assert.match(leads, /semLeadsDeTeste\(/);
});

test("lista do celular mantém Assumir conversa, valor da venda e motivo da perda", () => {
  const lista = ler("app/crm/[slug]/LeadsLista.tsx");
  assert.match(lista, /onTogglePausa/);
  assert.match(lista, /Assumir conversa/);
  assert.match(lista, /Devolver pra IA/);
  assert.match(lista, /valor_conversao/);
  assert.match(lista, /MOTIVOS_PERDA/);
  assert.match(ler("app/crm/[slug]/KanbanBoard.tsx"), /<LeadsLista[\s\S]*?onTogglePausa=\{atendimentoIa \? handleTogglePausa : undefined\}/);
});

test("botão Assumir conversa só aparece para cliente com atendimento de IA", () => {
  const kanban = ler("app/crm/[slug]/KanbanBoard.tsx");
  assert.match(kanban, /atendimentoIa \? handleTogglePausa : undefined/);
  assert.doesNotMatch(kanban, /onTogglePausa=\{handleTogglePausa\}/);
  const lista = ler("app/crm/[slug]/LeadsLista.tsx");
  assert.match(lista, /onTogglePausa\?: \(lead: LeadRow\) => void/);
  assert.match(lista, /\{onTogglePausa \? \(/);
  for (const pagina of ["app/crm/[slug]/page.tsx", "app/clientes/[id]/crm/page.tsx"]) {
    const src = ler(pagina);
    assert.match(src, /atendimento_ia/, `${pagina}: não lê atendimento_ia`);
    assert.match(src, /atendimentoIa=\{/, `${pagina}: não passa atendimentoIa`);
  }
  assert.match(ler("supabase/migrations/20260929200000_clientes_atendimento_ia.sql"), /add column if not exists atendimento_ia boolean not null default false/);
});

test("portal do cliente não mostra a busca interna do Hub", () => {
  assert.match(ler("app/components/dashboard/Topbar.tsx"), /busca \? \(/);
  assert.match(ler("app/components/dashboard/AppShell.tsx"), /busca=\{variant !== "portal"\}/);
});

test("tocar no lead abre a ficha com as respostas do formulário, no portal e na tela interna", () => {
  const ficha = ler("app/crm/[slug]/FichaLead.tsx");
  assert.match(ficha, /formatarRespostas\(/);
  assert.match(ficha, /linkWhatsApp\(/);
  assert.match(ficha, /Abrir no WhatsApp/);
  const kanban = ler("app/crm/[slug]/KanbanBoard.tsx");
  assert.match(kanban, /<FichaLead/);
  assert.match(kanban, /onAbrir/);
  assert.match(ler("app/crm/[slug]/LeadsLista.tsx"), /onAbrir\(lead\)/);
  assert.match(ler("app/crm/[slug]/LeadsLista.tsx"), /formatarChegada\(/);
  assert.match(kanban, /formatarChegada\(/);
  assert.match(kanban, /type="date"/);
  for (const pagina of ["app/crm/[slug]/page.tsx", "app/clientes/[id]/crm/page.tsx"]) {
    assert.match(ler(pagina), /respostas_formulario/, `${pagina}: não carrega as respostas`);
  }
});
