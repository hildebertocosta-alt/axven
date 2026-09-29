# Painel Axven · Entrega 2 (Portal novo + Camilo no ar): plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar ao cliente um portal com duas abas, **Leads** (mover leads pelo celular com botões grandes, ver o anúncio de origem e há quantos dias o lead está parado) e **Resultado** (investimento, vendas, custo por venda, ROAS, funil com o gargalo destacado e ranking de anúncios por venda). E colocar o atendente do Camilo (Joelson) para usar.

**Architecture:**
- Os cálculos ficam em dois módulos puros, testados com `node --test`: `app/lib/portalLeads.ts` (dias parado, filtros) e `app/lib/portalResultado.ts` (período, resumo, funil e gargalo, ranking por anúncio).
- A aba Resultado é um componente de servidor. Ele lê `leads`, `lead_etapa_eventos`, `cliente_etapas` e `meta_ads_insights_daily` com `supabaseAdmin`, depois que o `proxy.ts` já confirmou que o usuário é daquele cliente, e não precisa de JavaScript no navegador.
- A aba Leads reaproveita o `KanbanBoard`. No celular ele vira uma lista com botões "Mover para"; no computador continua o Kanban. As duas formas usam a mesma função de mover.
- Como o menu lateral some em telas menores que `lg`, a navegação entre abas vira uma barra no topo da página (`PortalTabs`).

**Tech Stack:** Next.js 16 (App Router, componentes de servidor) · React 19 · TypeScript · Tailwind v4 · Supabase · testes com `node --test` sobre `.ts` (Node 24).

**Spec:** `docs/superpowers/specs/2026-09-29-painel-axven-design.md`, seção 5 e seção 12 (entrega 2). A entrega 1 (base) já está no ar: `cliente_etapas`, `lead_etapa_eventos`, `leads.etapa_alterada_em` e `leads.motivo_perda`.

## Global Constraints

- O portal nunca mostra dados de outro cliente. As páginas do portal leem pelo `slug`, e o `proxy.ts` já nega o acesso se o usuário logado não for daquele cliente. Não enfraquecer essa checagem.
- Etapas: vêm de `cliente_etapas`, ordenadas por `ordenarEtapas`. Os tipos são `novo | qualificacao | oportunidade | venda | perdido`. Venda exige valor e perda exige motivo, e isso já é garantido pelo banco.
- Período padrão da aba Resultado: **mês atual**. Opções: `mes`, `7d`, `30d` e `personalizado` (com início e fim).
- **Coorte:** os números da aba Resultado contam os leads que **chegaram** no período (`criado_em`), com a etapa atual de cada um. O investimento é o gasto do Meta no mesmo período (`metric_date`). A página deixa isso escrito ("leads que chegaram no período").
- Lead "parado" é aquele cuja etapa não muda há mais de **3 dias** (`etapa_alterada_em`) e que não está em Venda nem Perdido.
- O gargalo só é apontado quando a etapa de origem tem **pelo menos 5 leads**.
- Fuso horário: `America/Sao_Paulo`.
- Saem do portal as abas Conversas e Disparo. As páginas passam a redirecionar para Leads. As rotas de API delas ficam para a limpeza da entrega 4.
- Textos para o cliente em português simples: "Investimento", "Vendas", "Custo por venda", "Retorno (ROAS)". Nada de "CAPI", "UTM" ou "coorte" na tela.
- Nenhuma senha passa pelo Claude. O usuário do Joelson é criado pelo Hildeberto no painel do Supabase.

## Review Focus

1. **Cliente sem investimento no período** (conta sem sync, ou período antes do primeiro dia sincronizado). Custo por venda e ROAS mostram "—", sem divisão por zero, `NaN` ou `Infinity`. Coberto pelo teste de `resumoResultado` da Task 2.
2. **Lead perdido sem evento de perda no histórico**, como os leads migrados, cujo evento guarda a chave antiga em `etapa_anterior`. No funil, ele conta como parado na primeira etapa, e o cálculo não quebra. Coberto pelo teste de `funil` da Task 2.
3. **Período personalizado inválido** (fim antes do início, datas mal formadas, mais de 366 dias). Volta para o mês atual, sem erro na página. Coberto pelo teste de `resolverPeriodo` da Task 2.
4. **Anúncio com gasto e sem lead, e lead sem anúncio identificado.** Os dois aparecem no ranking: o primeiro com 0 leads, o segundo como "Sem anúncio identificado". Coberto pelo teste de `rankingAnuncios` da Task 2.
5. **Usuário do portal de outro cliente abrindo `/crm/{slug}/resultado`.** Tem que ser negado, como na aba Leads. O `proxy.ts` já cobre todo `/crm/{slug}/...`. Coberto pelo teste de contrato da Task 4, que confere que a página lê pelo `slug`, e pela verificação manual da Task 6.

---

## Preparação

- [ ] Criar a branch de trabalho a partir da `master` atualizada:

```bash
cd "C:/Users/Junior/Desktop/AXVEN/ORCA/axven"
git checkout master && git pull --ff-only
git checkout -b feat/painel-axven-portal
node --test tests/*.test.mjs
```
Esperado: `ℹ fail 0`.

---

### Task 1: Regras da aba Leads (`app/lib/portalLeads.ts`)

**Files:**
- Create: `app/lib/portalLeads.ts`
- Create: `tests/portal-leads.test.mjs`
- Modify: `package.json` (scripts)

**Interfaces:**
- Produces (usado pela Task 3):
  - `diasParado(desde: string | null | undefined, agora: Date): number`
  - `type FiltroLeads = { etapa: string; soParados: boolean; anuncio: string; chegada: "todos" | "7" | "30" }`
  - `const FILTRO_INICIAL: FiltroLeads`
  - `type LeadFiltravel = { etapa: string; criado_em: string; etapa_alterada_em?: string | null; anuncio?: string | null }`
  - `estaParado(lead: LeadFiltravel, etapasEncerradas: Set<string>, agora: Date): boolean`
  - `filtrarLeads<T extends LeadFiltravel>(leads: T[], filtro: FiltroLeads, etapasEncerradas: Set<string>, agora: Date): T[]`
  - `anunciosDosLeads(leads: LeadFiltravel[]): string[]`

- [ ] **Step 1: Escrever os testes que falham** em `tests/portal-leads.test.mjs`

```js
import assert from "node:assert/strict";
import test from "node:test";
import { FILTRO_INICIAL, anunciosDosLeads, diasParado, estaParado, filtrarLeads } from "../app/lib/portalLeads.ts";

const AGORA = new Date("2026-09-29T15:00:00.000Z");
const ENCERRADAS = new Set(["fechado", "perdido"]);
const lead = (over = {}) => ({ id: "x", etapa: "lead", criado_em: "2026-09-20T12:00:00Z", etapa_alterada_em: "2026-09-20T12:00:00Z", anuncio: "V01", ...over });

test("dias parado conta dias inteiros desde a última mudança de etapa", () => {
  assert.equal(diasParado("2026-09-26T15:00:00.000Z", AGORA), 3);
  assert.equal(diasParado("2026-09-26T15:00:01.000Z", AGORA), 2);
  assert.equal(diasParado("2026-09-29T14:00:00.000Z", AGORA), 0);
  assert.equal(diasParado(null, AGORA), 0);
  assert.equal(diasParado("data ruim", AGORA), 0);
});

test("parado é quem está há mais de 3 dias sem mudar e não está em Venda nem Perdido", () => {
  assert.equal(estaParado(lead({ etapa_alterada_em: "2026-09-25T14:00:00Z" }), ENCERRADAS, AGORA), true);
  assert.equal(estaParado(lead({ etapa_alterada_em: "2026-09-26T15:00:00Z" }), ENCERRADAS, AGORA), false);
  assert.equal(estaParado(lead({ etapa: "perdido", etapa_alterada_em: "2026-09-01T00:00:00Z" }), ENCERRADAS, AGORA), false);
  assert.equal(estaParado(lead({ etapa: "fechado", etapa_alterada_em: "2026-09-01T00:00:00Z" }), ENCERRADAS, AGORA), false);
});

test("sem etapa_alterada_em, usa a data de chegada", () => {
  assert.equal(estaParado(lead({ etapa_alterada_em: null, criado_em: "2026-09-01T00:00:00Z" }), ENCERRADAS, AGORA), true);
});

test("filtros por etapa, parados, anúncio e chegada se combinam", () => {
  const leads = [
    lead({ id: "a", etapa: "lead", anuncio: "V01", criado_em: "2026-09-28T10:00:00Z", etapa_alterada_em: "2026-09-28T10:00:00Z" }),
    lead({ id: "b", etapa: "lead", anuncio: "V02", criado_em: "2026-09-10T10:00:00Z", etapa_alterada_em: "2026-09-10T10:00:00Z" }),
    lead({ id: "c", etapa: "qualificado", anuncio: "V01", criado_em: "2026-09-01T10:00:00Z", etapa_alterada_em: "2026-09-02T10:00:00Z" }),
    lead({ id: "d", etapa: "perdido", anuncio: null, criado_em: "2026-08-01T10:00:00Z", etapa_alterada_em: "2026-08-02T10:00:00Z" }),
  ];
  const ids = (f) => filtrarLeads(leads, { ...FILTRO_INICIAL, ...f }, ENCERRADAS, AGORA).map((l) => l.id);
  assert.deepEqual(ids({}), ["a", "b", "c", "d"]);
  assert.deepEqual(ids({ etapa: "lead" }), ["a", "b"]);
  assert.deepEqual(ids({ soParados: true }), ["b", "c"]);
  assert.deepEqual(ids({ anuncio: "V01" }), ["a", "c"]);
  assert.deepEqual(ids({ chegada: "7" }), ["a"]);
  assert.deepEqual(ids({ chegada: "30" }), ["a", "b", "c"]);
  assert.deepEqual(ids({ etapa: "lead", soParados: true }), ["b"]);
});

test("lista de anúncios para o filtro vem sem repetição, em ordem alfabética, sem vazios", () => {
  assert.deepEqual(anunciosDosLeads([lead({ anuncio: "V02" }), lead({ anuncio: "V01" }), lead({ anuncio: "V02" }), lead({ anuncio: null }), lead({ anuncio: "  " })]), ["V01", "V02"]);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Em `package.json`, dentro de `"scripts"`, depois de `"test:painel-axven-base"`, acrescentar (com vírgula na linha anterior):
```json
    "test:portal-leads": "node --test tests/portal-leads.test.mjs"
```
Run: `npm run test:portal-leads`
Esperado: FAIL com `Cannot find module …app\lib\portalLeads.ts`.

- [ ] **Step 3: Implementar `app/lib/portalLeads.ts`**

```ts
// Regras da aba Leads do portal (Painel Axven · Entrega 2).
// Sem imports com alias, para ser testado direto com `node --test`.

const DIA_MS = 24 * 60 * 60 * 1000;
const LIMITE_PARADO_DIAS = 3;

export type FiltroLeads = { etapa: string; soParados: boolean; anuncio: string; chegada: "todos" | "7" | "30" };

export const FILTRO_INICIAL: FiltroLeads = { etapa: "todas", soParados: false, anuncio: "todos", chegada: "todos" };

export type LeadFiltravel = { etapa: string; criado_em: string; etapa_alterada_em?: string | null; anuncio?: string | null };

export function diasParado(desde: string | null | undefined, agora: Date): number {
  if (!desde) return 0;
  const inicio = new Date(desde).getTime();
  if (Number.isNaN(inicio)) return 0;
  return Math.max(0, Math.floor((agora.getTime() - inicio) / DIA_MS));
}

export function estaParado(lead: LeadFiltravel, etapasEncerradas: Set<string>, agora: Date): boolean {
  if (etapasEncerradas.has(lead.etapa)) return false;
  return diasParado(lead.etapa_alterada_em ?? lead.criado_em, agora) > LIMITE_PARADO_DIAS;
}

export function filtrarLeads<T extends LeadFiltravel>(
  leads: T[],
  filtro: FiltroLeads,
  etapasEncerradas: Set<string>,
  agora: Date,
): T[] {
  const limiteChegada = filtro.chegada === "todos" ? null : agora.getTime() - Number(filtro.chegada) * DIA_MS;
  return leads.filter((lead) => {
    if (filtro.etapa !== "todas" && lead.etapa !== filtro.etapa) return false;
    if (filtro.anuncio !== "todos" && (lead.anuncio ?? "") !== filtro.anuncio) return false;
    if (filtro.soParados && !estaParado(lead, etapasEncerradas, agora)) return false;
    if (limiteChegada !== null && new Date(lead.criado_em).getTime() < limiteChegada) return false;
    return true;
  });
}

export function anunciosDosLeads(leads: LeadFiltravel[]): string[] {
  const nomes = new Set<string>();
  for (const lead of leads) {
    const nome = (lead.anuncio ?? "").trim();
    if (nome) nomes.add(nome);
  }
  return [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
```

- [ ] **Step 4: Rodar até passar**

Run: `npm run test:portal-leads`
Esperado: 5 testes `pass`, 0 `fail`.

- [ ] **Step 5: Commit**

```bash
git add app/lib/portalLeads.ts tests/portal-leads.test.mjs package.json
git commit -m "feat(portal): regras de dias parado e filtros da aba Leads

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Regras da aba Resultado (`app/lib/portalResultado.ts`)

**Files:**
- Create: `app/lib/portalResultado.ts`
- Create: `tests/portal-resultado.test.mjs`
- Modify: `package.json` (scripts)

**Interfaces:**
- Produces (usado pela Task 4):
  - `type TipoEtapaResultado = "novo" | "qualificacao" | "oportunidade" | "venda" | "perdido"`
  - `type EtapaResultado = { chave: string; nome: string; tipo: TipoEtapaResultado }`, que recebe as etapas **já ordenadas**
  - `type LeadResultado = { etapa: string; etapaAntesDaPerda: string | null; valor: number | null; anuncioId: string | null; anuncioNome: string | null }`
  - `type GastoAnuncio = { adId: string; adNome: string | null; gasto: number }`
  - `type Periodo = { chave: "mes" | "7d" | "30d" | "personalizado"; inicio: string; fim: string; rotulo: string }`
  - `resolverPeriodo(params: { periodo?: string; inicio?: string; fim?: string }, hoje: string): Periodo`
  - `resumoResultado(etapas, leads, gastos): { investimento: number; leads: number; vendas: number; receita: number; custoPorVenda: number | null; roas: number | null; ticketMedio: number | null }`
  - `funil(etapas, leads): { etapas: { chave: string; nome: string; alcancaram: number; passagem: number | null }[]; gargalo: { chave: string; nome: string; perdaPct: number } | null }`
  - `rankingAnuncios(etapas, leads, gastos): { chave: string; nome: string; leads: number; vendas: number; receita: number; investimento: number; custoPorVenda: number | null }[]`

- [ ] **Step 1: Escrever os testes que falham** em `tests/portal-resultado.test.mjs`

```js
import assert from "node:assert/strict";
import test from "node:test";
import { funil, rankingAnuncios, resolverPeriodo, resumoResultado } from "../app/lib/portalResultado.ts";

const ETAPAS = [
  { chave: "lead", nome: "Novo", tipo: "novo" },
  { chave: "qualificado", nome: "Qualificado", tipo: "qualificacao" },
  { chave: "oportunidade", nome: "Visita", tipo: "oportunidade" },
  { chave: "fechado", nome: "Venda", tipo: "venda" },
  { chave: "perdido", nome: "Perdido", tipo: "perdido" },
];
const L = (etapa, over = {}) => ({ etapa, etapaAntesDaPerda: null, valor: null, anuncioId: "A1", anuncioNome: "V01", ...over });

test("período: mês atual é o padrão; 7 e 30 dias contam o dia de hoje", () => {
  assert.deepEqual(resolverPeriodo({}, "2026-09-29"), { chave: "mes", inicio: "2026-09-01", fim: "2026-09-29", rotulo: "Este mês" });
  assert.deepEqual(resolverPeriodo({ periodo: "7d" }, "2026-09-29"), { chave: "7d", inicio: "2026-09-23", fim: "2026-09-29", rotulo: "Últimos 7 dias" });
  assert.deepEqual(resolverPeriodo({ periodo: "30d" }, "2026-03-01"), { chave: "30d", inicio: "2026-01-31", fim: "2026-03-01", rotulo: "Últimos 30 dias" });
});

test("período personalizado válido é aceito; inválido volta para o mês atual", () => {
  assert.deepEqual(resolverPeriodo({ periodo: "personalizado", inicio: "2026-09-10", fim: "2026-09-20" }, "2026-09-29"),
    { chave: "personalizado", inicio: "2026-09-10", fim: "2026-09-20", rotulo: "10/09/2026 a 20/09/2026" });
  for (const p of [
    { periodo: "personalizado", inicio: "2026-09-20", fim: "2026-09-10" },
    { periodo: "personalizado", inicio: "ontem", fim: "2026-09-10" },
    { periodo: "personalizado", inicio: "2024-01-01", fim: "2026-09-10" },
    { periodo: "xyz" },
  ]) {
    assert.equal(resolverPeriodo(p, "2026-09-29").chave, "mes");
  }
});

test("resumo: vendas, receita, custo por venda, ROAS e ticket médio", () => {
  const leads = [L("lead"), L("qualificado"), L("fechado", { valor: 3000 }), L("fechado", { valor: 1000 }), L("perdido")];
  const gastos = [{ adId: "A1", adNome: "V01", gasto: 800 }, { adId: "A2", adNome: "V02", gasto: 200 }];
  assert.deepEqual(resumoResultado(ETAPAS, leads, gastos), {
    investimento: 1000, leads: 5, vendas: 2, receita: 4000, custoPorVenda: 500, roas: 4, ticketMedio: 2000,
  });
});

test("resumo sem investimento e sem venda não divide por zero", () => {
  assert.deepEqual(resumoResultado(ETAPAS, [L("lead")], []), {
    investimento: 0, leads: 1, vendas: 0, receita: 0, custoPorVenda: null, roas: null, ticketMedio: null,
  });
});

test("funil: quantos alcançaram cada etapa, a passagem e o gargalo", () => {
  const leads = [
    ...Array.from({ length: 6 }, () => L("lead")),
    ...Array.from({ length: 2 }, () => L("qualificado")),
    L("oportunidade"),
    L("fechado", { valor: 500 }),
    L("perdido", { etapaAntesDaPerda: "qualificado" }),
    L("perdido", { etapaAntesDaPerda: null }),
  ];
  const r = funil(ETAPAS, leads);
  assert.deepEqual(r.etapas.map((e) => [e.chave, e.alcancaram]), [["lead", 12], ["qualificado", 5], ["oportunidade", 2], ["fechado", 1]]);
  assert.deepEqual(r.etapas.map((e) => e.passagem === null ? null : Math.round(e.passagem * 100)), [null, 42, 40, 50]);
  assert.deepEqual(r.gargalo, { chave: "qualificado", nome: "Qualificado", perdaPct: 60 });
});

test("funil: etapa com menos de 5 leads não vira gargalo; sem leads não há gargalo", () => {
  const poucos = funil(ETAPAS, [L("lead"), L("lead"), L("qualificado")]);
  assert.equal(poucos.gargalo, null);
  const vazio = funil(ETAPAS, []);
  assert.equal(vazio.gargalo, null);
  assert.deepEqual(vazio.etapas.map((e) => e.alcancaram), [0, 0, 0, 0]);
});

test("funil: perdido com etapa antiga (chave que não existe mais) conta como parado no início", () => {
  const r = funil(ETAPAS, [L("perdido", { etapaAntesDaPerda: "desqualificado" })]);
  assert.deepEqual(r.etapas.map((e) => e.alcancaram), [1, 0, 0, 0]);
});

test("ranking por anúncio: receita, vendas e custo por venda; anúncio sem lead e lead sem anúncio aparecem", () => {
  const leads = [
    L("fechado", { valor: 2000, anuncioId: "A1", anuncioNome: "V01" }),
    L("lead", { anuncioId: "A1", anuncioNome: "V01" }),
    L("fechado", { valor: 500, anuncioId: "A2", anuncioNome: "V02" }),
    L("qualificado", { anuncioId: null, anuncioNome: null }),
  ];
  const gastos = [{ adId: "A1", adNome: "V01 · Bros", gasto: 400 }, { adId: "A2", adNome: "V02", gasto: 1000 }, { adId: "A3", adNome: "V03", gasto: 50 }];
  assert.deepEqual(rankingAnuncios(ETAPAS, leads, gastos), [
    { chave: "A1", nome: "V01 · Bros", leads: 2, vendas: 1, receita: 2000, investimento: 400, custoPorVenda: 400 },
    { chave: "A2", nome: "V02", leads: 1, vendas: 1, receita: 500, investimento: 1000, custoPorVenda: 1000 },
    { chave: "sem-anuncio", nome: "Sem anúncio identificado", leads: 1, vendas: 0, receita: 0, investimento: 0, custoPorVenda: null },
    { chave: "A3", nome: "V03", leads: 0, vendas: 0, receita: 0, investimento: 50, custoPorVenda: null },
  ]);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Em `package.json`, acrescentar ao `"scripts"`: `"test:portal-resultado": "node --test tests/portal-resultado.test.mjs"`.
Run: `npm run test:portal-resultado`
Esperado: FAIL com `Cannot find module …app\lib\portalResultado.ts`.

- [ ] **Step 3: Implementar `app/lib/portalResultado.ts`**

```ts
// Cálculos da aba Resultado do portal (Painel Axven · Entrega 2).
// Sem imports com alias, para ser testado direto com `node --test`.
// Coorte: conta os leads que CHEGARAM no período, com a etapa atual de cada um.

export type TipoEtapaResultado = "novo" | "qualificacao" | "oportunidade" | "venda" | "perdido";
export type EtapaResultado = { chave: string; nome: string; tipo: TipoEtapaResultado };
export type LeadResultado = {
  etapa: string;
  etapaAntesDaPerda: string | null;
  valor: number | null;
  anuncioId: string | null;
  anuncioNome: string | null;
};
export type GastoAnuncio = { adId: string; adNome: string | null; gasto: number };
export type Periodo = { chave: "mes" | "7d" | "30d" | "personalizado"; inicio: string; fim: string; rotulo: string };

const MINIMO_LEADS_GARGALO = 5;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const DIA_MS = 24 * 60 * 60 * 1000;

function paraData(texto: string): Date | null {
  if (!DATA.test(texto)) return null;
  const data = new Date(`${texto}T00:00:00Z`);
  return Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== texto ? null : data;
}

function somarDias(texto: string, dias: number): string {
  return new Date((paraData(texto) as Date).getTime() + dias * DIA_MS).toISOString().slice(0, 10);
}

function formatarData(texto: string): string {
  const [ano, mes, dia] = texto.split("-");
  return `${dia}/${mes}/${ano}`;
}

const dinheiro = (valor: number) => Math.round(valor * 100) / 100;

export function resolverPeriodo(params: { periodo?: string; inicio?: string; fim?: string }, hoje: string): Periodo {
  if (params.periodo === "7d") return { chave: "7d", inicio: somarDias(hoje, -6), fim: hoje, rotulo: "Últimos 7 dias" };
  if (params.periodo === "30d") return { chave: "30d", inicio: somarDias(hoje, -29), fim: hoje, rotulo: "Últimos 30 dias" };
  if (params.periodo === "personalizado" && params.inicio && params.fim) {
    const inicio = paraData(params.inicio);
    const fim = paraData(params.fim);
    if (inicio && fim && inicio <= fim && (fim.getTime() - inicio.getTime()) / DIA_MS <= 366) {
      return {
        chave: "personalizado",
        inicio: params.inicio,
        fim: params.fim,
        rotulo: `${formatarData(params.inicio)} a ${formatarData(params.fim)}`,
      };
    }
  }
  return { chave: "mes", inicio: `${hoje.slice(0, 8)}01`, fim: hoje, rotulo: "Este mês" };
}

function tipoDe(etapas: EtapaResultado[], chave: string): TipoEtapaResultado | null {
  return etapas.find((etapa) => etapa.chave === chave)?.tipo ?? null;
}

function ehVenda(etapas: EtapaResultado[], lead: LeadResultado): boolean {
  return tipoDe(etapas, lead.etapa) === "venda" && Number(lead.valor ?? 0) > 0;
}

export function resumoResultado(etapas: EtapaResultado[], leads: LeadResultado[], gastos: GastoAnuncio[]) {
  const investimento = dinheiro(gastos.reduce((total, gasto) => total + Number(gasto.gasto || 0), 0));
  const vendidos = leads.filter((lead) => ehVenda(etapas, lead));
  const receita = dinheiro(vendidos.reduce((total, lead) => total + Number(lead.valor), 0));
  const vendas = vendidos.length;
  return {
    investimento,
    leads: leads.length,
    vendas,
    receita,
    custoPorVenda: vendas > 0 && investimento > 0 ? dinheiro(investimento / vendas) : null,
    roas: investimento > 0 ? Math.round((receita / investimento) * 100) / 100 : null,
    ticketMedio: vendas > 0 ? dinheiro(receita / vendas) : null,
  };
}

export function funil(etapas: EtapaResultado[], leads: LeadResultado[]) {
  const caminho = etapas.filter((etapa) => etapa.tipo !== "perdido");
  const posicao = new Map(caminho.map((etapa, indice) => [etapa.chave, indice]));

  const alcancou = leads.map((lead) => {
    if (tipoDe(etapas, lead.etapa) === "perdido") {
      return lead.etapaAntesDaPerda !== null && posicao.has(lead.etapaAntesDaPerda) ? (posicao.get(lead.etapaAntesDaPerda) as number) : 0;
    }
    return posicao.get(lead.etapa) ?? 0;
  });

  const resultado = caminho.map((etapa, indice) => ({
    chave: etapa.chave,
    nome: etapa.nome,
    alcancaram: alcancou.filter((posicaoLead) => posicaoLead >= indice).length,
    passagem: null as number | null,
  }));
  for (let i = 1; i < resultado.length; i += 1) {
    const anterior = resultado[i - 1].alcancaram;
    resultado[i].passagem = anterior > 0 ? resultado[i].alcancaram / anterior : null;
  }

  let gargalo: { chave: string; nome: string; perdaPct: number } | null = null;
  let menorPassagem = 1;
  for (let i = 1; i < resultado.length; i += 1) {
    const passagem = resultado[i].passagem;
    if (passagem === null || resultado[i - 1].alcancaram < MINIMO_LEADS_GARGALO) continue;
    if (passagem < menorPassagem) {
      menorPassagem = passagem;
      gargalo = { chave: resultado[i - 1].chave, nome: resultado[i - 1].nome, perdaPct: Math.round((1 - passagem) * 100) };
    }
  }

  return { etapas: resultado, gargalo };
}

export function rankingAnuncios(etapas: EtapaResultado[], leads: LeadResultado[], gastos: GastoAnuncio[]) {
  type Linha = { chave: string; nome: string; leads: number; vendas: number; receita: number; investimento: number };
  const linhas = new Map<string, Linha>();
  const linha = (chave: string, nome: string) => {
    if (!linhas.has(chave)) linhas.set(chave, { chave, nome, leads: 0, vendas: 0, receita: 0, investimento: 0 });
    return linhas.get(chave) as Linha;
  };

  for (const gasto of gastos) {
    const atual = linha(gasto.adId, gasto.adNome ?? gasto.adId);
    atual.investimento = dinheiro(atual.investimento + Number(gasto.gasto || 0));
    if (gasto.adNome) atual.nome = gasto.adNome;
  }

  for (const lead of leads) {
    const chave = lead.anuncioId ?? (lead.anuncioNome ? `nome:${lead.anuncioNome}` : "sem-anuncio");
    const nome = lead.anuncioNome ?? (chave === "sem-anuncio" ? "Sem anúncio identificado" : chave);
    const atual = linha(chave, nome);
    atual.leads += 1;
    if (ehVenda(etapas, lead)) {
      atual.vendas += 1;
      atual.receita = dinheiro(atual.receita + Number(lead.valor));
    }
  }

  return [...linhas.values()]
    .map((item) => ({ ...item, custoPorVenda: item.vendas > 0 && item.investimento > 0 ? dinheiro(item.investimento / item.vendas) : null }))
    .sort((a, b) => b.receita - a.receita || b.vendas - a.vendas || b.leads - a.leads || b.investimento - a.investimento);
}
```

- [ ] **Step 4: Rodar até passar**

Run: `npm run test:portal-resultado`
Esperado: 8 testes `pass`, 0 `fail`.

- [ ] **Step 5: Commit**

```bash
git add app/lib/portalResultado.ts tests/portal-resultado.test.mjs package.json
git commit -m "feat(portal): cálculos da aba Resultado (período, resumo, funil, gargalo, ranking)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Aba Leads com lista para o celular, filtros, anúncio e dias parado

**Files:**
- Create: `app/crm/[slug]/portalNav.ts`
- Create: `app/crm/[slug]/LeadsLista.tsx`
- Modify: `app/crm/[slug]/PortalTabs.tsx` (arquivo inteiro)
- Modify: `app/crm/[slug]/KanbanBoard.tsx`
- Modify: `app/crm/[slug]/page.tsx`
- Modify: `app/clientes/[id]/crm/page.tsx` (select)
- Create: `tests/portal-contratos.test.mjs`
- Modify: `package.json` (scripts)

**Interfaces:**
- Consumes: `diasParado`, `estaParado`, `filtrarLeads`, `anunciosDosLeads`, `FILTRO_INICIAL` e `FiltroLeads` (Task 1); `EtapaCliente`, `ETAPA_VENDA`, `ETAPA_PERDIDO` e `ordenarEtapas` (entrega 1).
- Produces:
  - `portalSidebarItems(slug: string): NavItem[]` e `portalTabs(slug: string)`, usados pela Task 4;
  - `PortalTabs({ slug, active: "leads" | "resultado" })`;
  - `LeadRow` ganha `anuncio?: string | null` e `etapa_alterada_em?: string | null`.

- [ ] **Step 1: Escrever o teste de contrato que falha** em `tests/portal-contratos.test.mjs`

```js
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
```

Em `package.json`, acrescentar: `"test:portal-contratos": "node --test tests/portal-contratos.test.mjs"`.
Run: `npm run test:portal-contratos`
Esperado: FAIL (`ENOENT` em `portalNav.ts` ou regex de `PortalTabs`).

- [ ] **Step 2: Criar `app/crm/[slug]/portalNav.ts`** (sem `"use client"`, porque é usado pelas páginas de servidor)

```ts
import type { NavItem } from "@/app/components/dashboard/Sidebar";

export function portalSidebarItems(slug: string): NavItem[] {
  return [
    { label: "Leads", href: `/crm/${slug}`, icon: "🧲" },
    { label: "Resultado", href: `/crm/${slug}/resultado`, icon: "📈" },
  ];
}
```

- [ ] **Step 3: Reescrever `app/crm/[slug]/PortalTabs.tsx`**

```tsx
import Link from "next/link";

// Abas no topo do portal: o menu lateral só aparece em telas grandes (lg),
// então no celular é por aqui que o cliente navega.
export function PortalTabs({ slug, active }: { slug: string; active: "leads" | "resultado" }) {
  const tabs = [
    { key: "leads" as const, label: "Leads", href: `/crm/${slug}` },
    { key: "resultado" as const, label: "Resultado", href: `/crm/${slug}/resultado` },
  ];

  return (
    <nav className="mb-5 flex gap-2 border-b border-white/10 pb-3">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
            active === tab.key ? "bg-[#ff5a3c] text-zinc-950" : "text-zinc-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: Criar `app/crm/[slug]/LeadsLista.tsx`** (lista para o celular)

```tsx
"use client";

import { diasParado, estaParado } from "@/app/lib/portalLeads";
import type { EtapaCliente } from "@/app/lib/leadEtapas";
import type { LeadRow } from "./KanbanBoard";

type Props = {
  leads: LeadRow[];
  etapas: EtapaCliente[];
  encerradas: Set<string>;
  agora: Date;
  onMover: (lead: LeadRow, etapaDestino: string) => void;
};

export function LeadsLista({ leads, etapas, encerradas, agora, onMover }: Props) {
  const nomeEtapa = (chave: string) => etapas.find((etapa) => etapa.chave === chave)?.nome ?? chave;

  if (leads.length === 0) {
    return <p className="rounded-2xl border border-white/10 p-6 text-center text-sm text-zinc-400 md:hidden">Nenhum lead com esses filtros.</p>;
  }

  return (
    <ul className="space-y-3 md:hidden">
      {leads.map((lead) => {
        const parado = estaParado(lead, encerradas, agora);
        const dias = diasParado(lead.etapa_alterada_em ?? lead.criado_em, agora);
        return (
          <li key={lead.id} className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-white">{lead.nome}</p>
                <p className="text-sm text-zinc-400">{lead.telefone ?? "Sem telefone"}</p>
              </div>
              <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-200">{nomeEtapa(lead.etapa)}</span>
            </div>
            {lead.anuncio ? <p className="mt-2 truncate text-xs text-zinc-400">📣 {lead.anuncio}</p> : null}
            {!encerradas.has(lead.etapa) ? (
              <p className={`mt-1 text-xs ${parado ? "font-semibold text-amber-300" : "text-zinc-500"}`}>
                {dias === 0 ? "Atualizado hoje" : `Parado há ${dias} ${dias === 1 ? "dia" : "dias"}`}
              </p>
            ) : null}
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Mover para</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {etapas
                .filter((etapa) => etapa.chave !== lead.etapa)
                .map((etapa) => (
                  <button
                    key={etapa.chave}
                    type="button"
                    onClick={() => onMover(lead, etapa.chave)}
                    className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-white active:bg-white/15"
                  >
                    {etapa.nome}
                  </button>
                ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 5: `KanbanBoard.tsx`, imports e tipo**

Depois do bloco de import de `@/app/lib/leadEtapas`, acrescentar:

```ts
import { FILTRO_INICIAL, anunciosDosLeads, diasParado, estaParado, filtrarLeads, type FiltroLeads } from "@/app/lib/portalLeads";
import { LeadsLista } from "./LeadsLista";
```

Em `LeadRow`, depois de `motivo_perda?: string | null;`, acrescentar:

```ts
  anuncio?: string | null;
  etapa_alterada_em?: string | null;
```

- [ ] **Step 6: `KanbanBoard.tsx`, card com anúncio e dias parado**

No `LeadCard`, logo depois do bloco `{lead.origem ? ( … ) : null}`, acrescentar:

```tsx
      {lead.anuncio ? <p className="mt-2 truncate text-[11px] text-zinc-400">📣 {lead.anuncio}</p> : null}

      {lead.etapa !== ETAPA_VENDA && lead.etapa !== ETAPA_PERDIDO ? (
        (() => {
          const dias = diasParado(lead.etapa_alterada_em ?? lead.criado_em, new Date());
          return (
            <p className={`mt-1 text-[11px] ${dias > 3 ? "font-semibold text-amber-300" : "text-zinc-500"}`}>
              {dias === 0 ? "Atualizado hoje" : `Parado há ${dias} ${dias === 1 ? "dia" : "dias"}`}
            </p>
          );
        })()
      ) : null}
```

- [ ] **Step 7: `KanbanBoard.tsx`, a função única `moverPara`**

Trocar o corpo de `handleDragEnd` (da linha `if (!targetColumn || targetColumn === draggedLead.etapa) return;` até o fim da função) por uma chamada a `moverPara`, e criar `moverPara` logo acima de `handleDragEnd`:

```tsx
  async function moverPara(lead: LeadRow, targetColumn: string) {
    if (!targetColumn || targetColumn === lead.etapa) return;

    if (targetColumn === ETAPA_VENDA) {
      setPendingClosure({ lead, etapaAnterior: lead.etapa });
      setSaleValue(lead.valor_conversao ? String(lead.valor_conversao) : "");
      setSaleDate(lead.data_conversao ? lead.data_conversao.slice(0, 10) : localToday());
      setClosureError(null);
      return;
    }

    if (targetColumn === ETAPA_PERDIDO) {
      setPendingLoss({ lead, etapaAnterior: lead.etapa });
      setLossReason("");
      setLossDetail("");
      setLossError(null);
      return;
    }

    const previousLeads = leads;
    const updatedAt = new Date().toISOString();

    setLeads((prev) =>
      prev.map((item) => (item.id === lead.id ? { ...item, etapa: targetColumn, motivo_perda: null, etapa_alterada_em: updatedAt, atualizado_em: updatedAt } : item)),
    );

    const error = accessMode === "internal"
      ? await updateInternalLead(lead.id, { etapa: targetColumn })
      : (await supabase.from("leads").update({ etapa: targetColumn, atualizado_em: updatedAt }).eq("id", lead.id)).error;

    if (error) {
      setLeads(previousLeads);
      return;
    }

    if (accessMode === "portal") {
      notifyStageChange(lead, lead.etapa, targetColumn);
    }
  }
```

E o `handleDragEnd` fica:

```tsx
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveLead(null);
    if (!over) return;

    const draggedLead = leads.find((item) => item.id === active.id);
    if (!draggedLead) return;

    const targetColumn = columns.find((col) => col.key === over.id)?.key
      ?? leads.find((item) => item.id === over.id)?.etapa;

    if (targetColumn) await moverPara(draggedLead, targetColumn);
  }
```

Em `confirmClosure` e em `confirmLoss`, onde o `setLeads` monta o lead atualizado, acrescentar `etapa_alterada_em: <o mesmo valor de atualizado_em daquele bloco>` ao objeto. Em `confirmClosure`, usar `String(leadAtualizado.atualizado_em ?? new Date().toISOString())`; em `confirmLoss`, usar `atualizadoEm`.

- [ ] **Step 8: `KanbanBoard.tsx`, filtros e as duas formas de exibir**

Depois de `const columns = montarColunas(etapas);`, acrescentar:

```tsx
  const etapasOrdenadas = ordenarEtapas(etapas);
  const encerradas = new Set(etapas.filter((etapa) => etapa.tipo === "venda" || etapa.tipo === "perdido").map((etapa) => etapa.chave));
  const [filtro, setFiltro] = useState<FiltroLeads>(FILTRO_INICIAL);
  const agora = new Date();
```

No JSX de retorno, logo depois de `<>`, antes de `<DndContext`, acrescentar a barra de filtros e a lista do celular:

```tsx
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={filtro.etapa}
          onChange={(event) => setFiltro((atual) => ({ ...atual, etapa: event.target.value }))}
          className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          <option value="todas">Todas as etapas</option>
          {etapasOrdenadas.map((etapa) => (
            <option key={etapa.chave} value={etapa.chave}>{etapa.nome}</option>
          ))}
        </select>
        <select
          value={filtro.anuncio}
          onChange={(event) => setFiltro((atual) => ({ ...atual, anuncio: event.target.value }))}
          className="max-w-[220px] rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          <option value="todos">Todos os anúncios</option>
          {anunciosDosLeads(leads).map((nome) => (
            <option key={nome} value={nome}>{nome}</option>
          ))}
        </select>
        <select
          value={filtro.chegada}
          onChange={(event) => setFiltro((atual) => ({ ...atual, chegada: event.target.value as FiltroLeads["chegada"] }))}
          className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          <option value="todos">Chegaram quando quiser</option>
          <option value="7">Chegaram nos últimos 7 dias</option>
          <option value="30">Chegaram nos últimos 30 dias</option>
        </select>
        <button
          type="button"
          onClick={() => setFiltro((atual) => ({ ...atual, soParados: !atual.soParados }))}
          className={`rounded-xl border px-3 py-2 text-sm font-medium ${filtro.soParados ? "border-amber-400/50 bg-amber-400/15 text-amber-200" : "border-white/10 text-zinc-300"}`}
        >
          Parados há mais de 3 dias ({leads.filter((lead) => estaParado(lead, encerradas, agora)).length})
        </button>
      </div>

      <LeadsLista
        leads={filtrarLeads(leads, filtro, encerradas, agora)}
        etapas={etapasOrdenadas}
        encerradas={encerradas}
        agora={agora}
        onMover={moverPara}
      />
```

Envolver o `<DndContext …>…</DndContext>` inteiro num `<div className="hidden md:block">…</div>`. Dentro dele, trocar `leads={leads.filter((lead) => lead.etapa === column.key)}` por:

```tsx
              leads={filtrarLeads(leads, filtro, encerradas, agora).filter((lead) => lead.etapa === column.key)}
```

- [ ] **Step 9: Página do portal** (`app/crm/[slug]/page.tsx`)

Acrescentar os imports:

```ts
import { PortalTabs } from "./PortalTabs";
import { portalSidebarItems } from "./portalNav";
```

No `select` de `fetchAllLeads`, trocar `"…, data_conversao, motivo_perda"` por `"…, data_conversao, motivo_perda, anuncio, etapa_alterada_em"`. A string completa fica:

`"id, nome, telefone, etapa, cliente_id, origem, criado_em, atualizado_em, pausado_ia, valor_conversao, moeda, data_conversao, motivo_perda, anuncio, etapa_alterada_em"`

Trocar o bloco `sidebarItems={[ … ]}` (os três itens Kanban, Conversas e Disparo) por:

```tsx
      sidebarItems={portalSidebarItems(slug)}
```

Trocar `activeLabel="Kanban"` por `activeLabel="Leads"` e `subtitle="CRM · Kanban de leads"` por `subtitle="Seus leads"`. Imediatamente antes de `<KanbanBoard`, acrescentar:

```tsx
      <PortalTabs slug={slug} active="leads" />
```

- [ ] **Step 10: Página interna carrega os campos novos** (`app/clientes/[id]/crm/page.tsx`)

No `select` de `fetchAllLeads`, trocar `"…,data_conversao,motivo_perda"` por `"…,data_conversao,motivo_perda,anuncio,etapa_alterada_em"`.

- [ ] **Step 11: Testes, type-check e compilação**

Run: `npm run test:portal-contratos && npm run test:portal-leads && node --test tests/*.test.mjs && npx tsc --noEmit`
Esperado: todos `pass`, `tsc` sem erros.

Se `npx tsc` reclamar do tipo `NavItem` (`icon: ReactNode` recebendo string), está correto: `string` é `ReactNode`. Qualquer outro erro precisa ser corrigido.

- [ ] **Step 12: Commit**

```bash
git add "app/crm/[slug]/portalNav.ts" "app/crm/[slug]/LeadsLista.tsx" "app/crm/[slug]/PortalTabs.tsx" "app/crm/[slug]/KanbanBoard.tsx" "app/crm/[slug]/page.tsx" "app/clientes/[id]/crm/page.tsx" tests/portal-contratos.test.mjs package.json
git commit -m "feat(portal): aba Leads com lista para celular, filtros, anúncio e dias parado

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Aba Resultado e saída de Conversas e Disparo

**Files:**
- Create: `app/crm/[slug]/resultado/page.tsx`
- Modify: `app/crm/[slug]/conversas/page.tsx` (arquivo inteiro vira redirecionamento)
- Modify: `app/crm/[slug]/disparo/page.tsx` (arquivo inteiro vira redirecionamento)
- Delete: `app/crm/[slug]/conversas/ConversasView.tsx`, `app/crm/[slug]/disparo/DisparoView.tsx`
- Modify: `tests/painel-axven-base-contratos.test.mjs` (tirar asserções sobre os arquivos apagados)
- Modify: `tests/portal-contratos.test.mjs` (novo teste)

**Interfaces:**
- Consumes: `resolverPeriodo`, `resumoResultado`, `funil`, `rankingAnuncios` e os tipos (Task 2); `portalSidebarItems` e `PortalTabs` (Task 3); `ordenarEtapas` e `EtapaCliente` (entrega 1).

- [ ] **Step 1: Escrever o teste que falha.** Acrescentar a `tests/portal-contratos.test.mjs`:

```js
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
```

Run: `npm run test:portal-contratos`
Esperado: FAIL em "aba Resultado" (`ENOENT`) e em "Conversas e Disparo".

- [ ] **Step 2: Criar `app/crm/[slug]/resultado/page.tsx`**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "../../../components/dashboard/AppShell";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { ordenarEtapas, type EtapaCliente } from "@/app/lib/leadEtapas";
import {
  funil,
  rankingAnuncios,
  resolverPeriodo,
  resumoResultado,
  type GastoAnuncio,
  type LeadResultado,
} from "@/app/lib/portalResultado";
import { LogoutButton } from "../LogoutButton";
import { PortalTabs } from "../PortalTabs";
import { portalSidebarItems } from "../portalNav";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ periodo?: string; inicio?: string; fim?: string }>;
};

const moeda = (valor: number | null) =>
  valor === null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(valor);
const inteiro = (valor: number) => new Intl.NumberFormat("pt-BR").format(valor);

function hojeEmSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export default async function ResultadoPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const periodo = resolverPeriodo(await searchParams, hojeEmSaoPaulo());

  const { data: cliente } = await supabaseAdmin.from("clientes").select("id, nome").eq("slug", slug).single();
  if (!cliente) notFound();

  const inicioTs = `${periodo.inicio}T00:00:00-03:00`;
  const fimTs = `${periodo.fim}T23:59:59.999-03:00`;

  const [etapasRes, leadsRes, gastosRes] = await Promise.all([
    supabaseAdmin.from("cliente_etapas").select("chave, nome, tipo, ordem").eq("cliente_id", cliente.id).eq("ativo", true),
    supabaseAdmin
      .from("leads")
      .select("id, etapa, valor_conversao, anuncio_source_id, anuncio")
      .eq("cliente_id", cliente.id)
      .gte("criado_em", inicioTs)
      .lte("criado_em", fimTs)
      .limit(5000),
    supabaseAdmin
      .from("meta_ads_insights_daily")
      .select("ad_id, ad_name, spend")
      .eq("cliente_id", cliente.id)
      .gte("metric_date", periodo.inicio)
      .lte("metric_date", periodo.fim)
      .limit(20000),
  ]);
  if (etapasRes.error) throw etapasRes.error;
  if (leadsRes.error) throw leadsRes.error;
  if (gastosRes.error) throw gastosRes.error;

  const etapas = ordenarEtapas((etapasRes.data ?? []) as EtapaCliente[]);
  const chavesPerdido = new Set(etapas.filter((etapa) => etapa.tipo === "perdido").map((etapa) => etapa.chave));
  const leadsBrutos = leadsRes.data ?? [];

  const idsPerdidos = leadsBrutos.filter((lead) => chavesPerdido.has(lead.etapa)).map((lead) => lead.id);
  const antesDaPerda = new Map<string, string | null>();
  if (idsPerdidos.length > 0) {
    const { data: eventos, error } = await supabaseAdmin
      .from("lead_etapa_eventos")
      .select("lead_id, etapa_anterior, criado_em")
      .in("lead_id", idsPerdidos)
      .in("etapa_nova", [...chavesPerdido])
      .order("criado_em", { ascending: false });
    if (error) throw error;
    for (const evento of eventos ?? []) {
      if (!antesDaPerda.has(evento.lead_id)) antesDaPerda.set(evento.lead_id, evento.etapa_anterior);
    }
  }

  const leads: LeadResultado[] = leadsBrutos.map((lead) => ({
    etapa: lead.etapa,
    etapaAntesDaPerda: antesDaPerda.get(lead.id) ?? null,
    valor: lead.valor_conversao === null ? null : Number(lead.valor_conversao),
    anuncioId: lead.anuncio_source_id,
    anuncioNome: lead.anuncio,
  }));

  const gastoPorAnuncio = new Map<string, GastoAnuncio>();
  for (const linha of gastosRes.data ?? []) {
    const atual = gastoPorAnuncio.get(linha.ad_id) ?? { adId: linha.ad_id, adNome: linha.ad_name, gasto: 0 };
    atual.gasto += Number(linha.spend ?? 0);
    gastoPorAnuncio.set(linha.ad_id, atual);
  }
  const gastos = [...gastoPorAnuncio.values()];

  const resumo = resumoResultado(etapas, leads, gastos);
  const funilCliente = funil(etapas, leads);
  const ranking = rankingAnuncios(etapas, leads, gastos).slice(0, 10);

  const cards = [
    { rotulo: "Investimento", valor: moeda(resumo.investimento) },
    { rotulo: "Leads", valor: inteiro(resumo.leads) },
    { rotulo: "Vendas", valor: inteiro(resumo.vendas) },
    { rotulo: "Receita", valor: moeda(resumo.receita) },
    { rotulo: "Custo por venda", valor: moeda(resumo.custoPorVenda) },
    { rotulo: "Retorno (ROAS)", valor: resumo.roas === null ? "—" : `${resumo.roas.toFixed(2).replace(".", ",")}x` },
    { rotulo: "Ticket médio", valor: moeda(resumo.ticketMedio) },
  ];

  const opcoes = [
    { chave: "mes", rotulo: "Este mês", href: `/crm/${slug}/resultado` },
    { chave: "7d", rotulo: "7 dias", href: `/crm/${slug}/resultado?periodo=7d` },
    { chave: "30d", rotulo: "30 dias", href: `/crm/${slug}/resultado?periodo=30d` },
  ];

  return (
    <AppShell
      title={cliente.nome}
      subtitle="Resultado"
      activeLabel="Resultado"
      actions={<LogoutButton />}
      variant="portal"
      sidebarItems={portalSidebarItems(slug)}
    >
      <PortalTabs slug={slug} active="resultado" />

      <div className="mb-5 flex flex-wrap items-end gap-2">
        {opcoes.map((opcao) => (
          <Link
            key={opcao.chave}
            href={opcao.href}
            className={`rounded-full px-4 py-2 text-sm font-medium ${periodo.chave === opcao.chave ? "bg-white text-zinc-950" : "border border-white/10 text-zinc-300"}`}
          >
            {opcao.rotulo}
          </Link>
        ))}
        <form className="flex flex-wrap items-end gap-2" action={`/crm/${slug}/resultado`}>
          <input type="hidden" name="periodo" value="personalizado" />
          <label className="text-xs text-zinc-400">
            De
            <input type="date" name="inicio" defaultValue={periodo.inicio} className="ml-1 rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-sm text-white" />
          </label>
          <label className="text-xs text-zinc-400">
            até
            <input type="date" name="fim" defaultValue={periodo.fim} className="ml-1 rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-sm text-white" />
          </label>
          <button type="submit" className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-200">Ver</button>
        </form>
      </div>

      <p className="mb-4 text-sm text-zinc-400">
        {periodo.rotulo}: números dos leads que chegaram no período, com a etapa em que cada um está hoje.
      </p>

      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {cards.map((card) => (
          <div key={card.rotulo} className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
            <p className="text-xs text-zinc-400">{card.rotulo}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{card.valor}</p>
          </div>
        ))}
      </section>

      <section className="mb-6 rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
        <h2 className="text-lg font-semibold text-white">Funil</h2>
        {funilCliente.gargalo ? (
          <p className="mt-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            ⚠️ <strong>{funilCliente.gargalo.perdaPct}%</strong> dos seus leads param em <strong>{funilCliente.gargalo.nome}</strong>. É aqui que vale focar.
          </p>
        ) : (
          <p className="mt-2 text-sm text-zinc-400">Ainda não há leads suficientes para apontar um gargalo.</p>
        )}
        <ol className="mt-4 grid gap-3 md:grid-cols-4">
          {funilCliente.etapas.map((etapa) => (
            <li
              key={etapa.chave}
              className={`rounded-xl border p-4 ${funilCliente.gargalo?.chave === etapa.chave ? "border-amber-400/50 bg-amber-400/5" : "border-white/10"}`}
            >
              <p className="text-sm text-zinc-300">{etapa.nome}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{inteiro(etapa.alcancaram)}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {etapa.passagem === null ? "Entrada do funil" : `${Math.round(etapa.passagem * 100)}% passaram da etapa anterior`}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
        <h2 className="text-lg font-semibold text-white">Anúncios que mais vendem</h2>
        {ranking.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-400">Nenhum anúncio com dados no período.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-zinc-400">
                <tr>
                  <th className="py-2 pr-3 font-medium">Anúncio</th>
                  <th className="py-2 pr-3 font-medium">Receita</th>
                  <th className="py-2 pr-3 font-medium">Vendas</th>
                  <th className="py-2 pr-3 font-medium">Leads</th>
                  <th className="py-2 pr-3 font-medium">Investimento</th>
                  <th className="py-2 font-medium">Custo por venda</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((linha) => (
                  <tr key={linha.chave} className="border-t border-white/5 text-zinc-200">
                    <td className="max-w-[260px] truncate py-2 pr-3">{linha.nome}</td>
                    <td className="py-2 pr-3">{moeda(linha.receita)}</td>
                    <td className="py-2 pr-3">{inteiro(linha.vendas)}</td>
                    <td className="py-2 pr-3">{inteiro(linha.leads)}</td>
                    <td className="py-2 pr-3">{moeda(linha.investimento)}</td>
                    <td className="py-2">{moeda(linha.custoPorVenda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
```

- [ ] **Step 3: Conversas e Disparo passam a redirecionar**

`app/crm/[slug]/conversas/page.tsx` e `app/crm/[slug]/disparo/page.tsx` ficam com este conteúdo (idêntico nos dois arquivos):

```tsx
import { redirect } from "next/navigation";

// Conversas e Disparo saíram do portal (spec do Painel Axven, seção 5). O link antigo leva para Leads.
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/crm/${slug}`);
}
```

Apagar `app/crm/[slug]/conversas/ConversasView.tsx` e `app/crm/[slug]/disparo/DisparoView.tsx`:

```bash
git rm "app/crm/[slug]/conversas/ConversasView.tsx" "app/crm/[slug]/disparo/DisparoView.tsx"
```

- [ ] **Step 4: Ajustar os testes de contrato da entrega 1** (`tests/painel-axven-base-contratos.test.mjs`)

Esses testes liam os arquivos que acabaram de ser apagados. Remover o teste inteiro `"aba Conversas conhece as etapas novas e mostra um rótulo para etapa personalizada"` e, dentro do teste `"Kanban desenha as colunas…"`, remover a linha:

```js
  assert.doesNotMatch(ler("app/crm/[slug]/disparo/DisparoView.tsx"), /"proposta_enviada"|"desqualificado"/);
```

- [ ] **Step 5: Rodar tudo**

Run: `npm run test:portal-contratos && npm run test:portal-resultado && node --test tests/*.test.mjs && npx tsc --noEmit`
Esperado: todos `pass`, `tsc` sem erros.

- [ ] **Step 6: Commit**

```bash
git add "app/crm/[slug]/resultado/page.tsx" "app/crm/[slug]/conversas/page.tsx" "app/crm/[slug]/disparo/page.tsx" tests/portal-contratos.test.mjs tests/painel-axven-base-contratos.test.mjs
git commit -m "feat(portal): aba Resultado com funil, gargalo e ranking; Conversas e Disparo saem do portal

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Revisão final, publicação e conferência

**Files:** nenhum arquivo de código novo.

- [ ] **Step 1: Revisão final da branch**, antes de publicar, com um revisor novo e este plano (incluindo o Review Focus). Corrigir os achados Critical e Important com teste antes de seguir.

- [ ] **Step 2: Publicar**

```bash
git checkout master && git pull --ff-only
git merge --no-ff feat/painel-axven-portal -m "Merge branch 'feat/painel-axven-portal'"
git push origin master
```

Acompanhar o deploy do projeto `axven` na Vercel até `READY`.

- [ ] **Step 3: Conferir no ar como Axven** (no Chrome, com o acesso interno já logado)

Abrir `https://www.axvendigital.com.br/clientes/89d834fc-c013-4510-b062-0d5de4b9f0b3/crm`. Esperado:
- aparece a barra de filtros;
- os cards mostram "📣 {anúncio}" e "Parado há N dias", em amarelo acima de 3 dias;
- com a janela estreita (menos de 768 px), aparece a lista com botões "Mover para".

- [ ] **Step 4: Conferir os números da aba Resultado com o banco**

`execute_sql` (projeto `ljexwrcevetpysmwjtyq`) para o mês atual do Camilo:

```sql
select
  (select count(*) from leads l join clientes c on c.id = l.cliente_id
    where c.slug = 'camilo-imoveis'
      and l.criado_em >= date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo') as leads_mes,
  (select coalesce(sum(spend), 0) from meta_ads_insights_daily m join clientes c on c.id = m.cliente_id
    where c.slug = 'camilo-imoveis'
      and m.metric_date >= date_trunc('month', now() at time zone 'America/Sao_Paulo')::date) as investimento_mes;
```

Esses dois números têm que bater com os cards "Leads" e "Investimento" da aba Resultado quando ela é aberta pelo Joelson (Step 6).

---

### Task 6: Acesso do Joelson (atendente do Camilo) e treino

**Files:**
- Modify: `AXVEN Cofri/03 - Clientes/Camilo Imóveis.md` (quem acessa o portal)

- [ ] **Step 1 (Hildeberto): criar o usuário no Supabase**

No painel do Supabase, no projeto **Axven** (`ljexwrcevetpysmwjtyq`): *Authentication → Users → Add user → Create new user*.
- **E-mail:** `joelsoncarvallho07@gmail.com`
- **Senha:** você escolhe
- **"Auto Confirm User":** marcado

A senha fica só com você e com o Joelson. Não passa pelo Claude.

- [ ] **Step 2: Vincular o Joelson ao Camilo**

`execute_sql`:

```sql
insert into public.crm_usuarios (user_id, cliente_id, nome, papel, recebe_lembrete)
select u.id, c.id, 'Joelson', 'atendente', false
from auth.users u, public.clientes c
where u.email = 'joelsoncarvallho07@gmail.com' and c.slug = 'camilo-imoveis'
on conflict (user_id) do update set cliente_id = excluded.cliente_id, nome = excluded.nome, papel = excluded.papel;

select cu.nome, cu.papel, c.nome as cliente
from public.crm_usuarios cu join public.clientes c on c.id = cu.cliente_id
join auth.users u on u.id = cu.user_id
where u.email = 'joelsoncarvallho07@gmail.com';
```

Esperado: uma linha `Joelson | atendente | Camilo Imóveis`. O `recebe_lembrete` fica `false` até a entrega 3 (lembrete diário).

- [ ] **Step 3 (Hildeberto): primeiro acesso pelo celular**

Entrar em `https://www.axvendigital.com.br/crm/login` com o e-mail e a senha do Joelson. Esperado:
- cai direto em `/crm/camilo-imoveis`;
- vê as abas Leads e Resultado no topo;
- no celular, vê a lista com os botões "Mover para".

Abrir `https://www.axvendigital.com.br/crm/obele` logado como Joelson. Esperado: é redirecionado para `/crm/login?erro=acesso_negado`. É a checagem de que ele não vê outro cliente.

- [ ] **Step 4: Mensagem de treino para o Joelson** (o Hildeberto envia pelo WhatsApp)

```
Oi, Joelson! Tudo bem? 👋

A partir de hoje os leads da Camilo Imóveis ficam num painel só:
👉 https://www.axvendigital.com.br/crm/login
(login: seu e-mail · a senha eu te passo por aqui)

Como usar (2 minutos por dia):
1. Aba *Leads*: cada pessoa que chamou pelo anúncio aparece aqui.
2. Depois de falar com a pessoa, toque em *Mover para* e escolha a etapa:
   • *Qualificado*: tem interesse e perfil
   • *Visita*: marcou visita ao imóvel
   • *Venda*: fechou (o painel pede o valor)
   • *Perdido*: não vai fechar (o painel pede o motivo)
3. Os que estão em amarelo estão *parados há mais de 3 dias*. Esses são prioridade.

Com isso a gente descobre quais anúncios trazem venda de verdade e coloca mais dinheiro neles. 🚀
Qualquer dúvida, me chama!
```

- [ ] **Step 5: Registrar no cofre**

Em `AXVEN Cofri/03 - Clientes/Camilo Imóveis.md`, acrescentar a seção:

```markdown
## Portal do cliente (desde DD/MM/2026)
- Atendente com acesso: **Joelson** (atendente) · login em `/crm/login`
- Abas: Leads (mover etapas, parados há +3 dias) e Resultado (funil, gargalo, anúncios que vendem)
- Critério de sucesso da entrega 2: o Joelson move leads sozinho durante 1 semana
```

---

## Self-review (feito ao escrever)

- **Cobertura da spec (seção 5 e entrega 2):**
  - Aba Leads: celular com botões (Task 3, `LeadsLista`); Kanban no computador; anúncio e dias parado com destaque acima de 3 dias; filtros por etapa, período de chegada, anúncio e "parados".
  - Venda pede valor e data, e Perdido pede motivo: já existem na entrega 1 e são reaproveitados por `moverPara`.
  - Aba Resultado: investimento, leads, vendas, receita, custo por venda, ROAS e ticket; funil com passagem e gargalo; ranking por vendas e receita ligado pelo ID do anúncio (Tasks 2 e 4).
  - Saída de Conversas e Disparo (Task 4); login do atendente do Camilo e treino de 15 minutos (Task 6).
  - "Pronto quando: o atendente move leads sozinho por uma semana": acompanhado pelo `lead_etapa_eventos` com `origem = portal`, depois da Task 6.
- **Fora desta entrega:** o histórico da conversa (seção 9), o lembrete diário e o envio da venda ao Meta (entrega 3), a Carteira e a limpeza das rotas de API (entrega 4).
- **Nomes conferidos entre tarefas:** `portalSidebarItems`, `PortalTabs` com `"leads" | "resultado"`, `moverPara(lead, targetColumn)`, `LeadsLista({ leads, etapas, encerradas, agora, onMover })`, `resolverPeriodo`, `resumoResultado`, `funil` e `rankingAnuncios`, cada um com as assinaturas da Interface das Tasks 1 e 2.
