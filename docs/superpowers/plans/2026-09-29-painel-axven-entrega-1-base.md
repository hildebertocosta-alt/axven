# Painel Axven · Entrega 1 (Base): plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a lista fixa de etapas dos leads de clientes por um funil configurável por cliente (Novo, Venda e Perdido fixas; as do meio livres), com histórico de todas as mudanças de etapa, venda sempre com valor e perda sempre com motivo, sem quebrar nenhum escritor atual da tabela `leads`.

**Architecture:** As regras ficam no banco (Supabase Postgres), para valerem para qualquer escritor: o portal (que grava direto pelo navegador com RLS), as rotas do Next e o n8n.
- Um gatilho `BEFORE` normaliza as etapas antigas, valida a etapa contra `cliente_etapas` e exige valor ou motivo.
- Um gatilho `AFTER` grava o evento em `lead_etapa_eventos`.
- As rotas do servidor passam a usar uma RPC única (`atualizar_etapa_lead_v1`) que informa a origem e o autor.
- No TypeScript, um módulo puro (`app/lib/leadEtapas.ts`) concentra as regras de entrada, e o Kanban passa a desenhar as colunas a partir das etapas do cliente.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Supabase (`@supabase/supabase-js` 2.108, projeto `ljexwrcevetpysmwjtyq`) · testes com `node --test` sobre `.ts` (Node 24) · SQL aplicado pelo conector Supabase (`execute_sql` para ensaio e `apply_migration` para produção).

**Spec:** `docs/superpowers/specs/2026-09-29-painel-axven-design.md`, seção 4.2 e seção 12 (entrega 1). Cópia no cofre: `AXVEN Cofri/01 - Projetos/Painel Axven — especificação (2026-09-29).md`.

## Global Constraints

- Etapas fixas com chaves imutáveis: `lead` (Novo, tipo `novo`), `fechado` (Venda, tipo `venda`), `perdido` (Perdido, tipo `perdido`).
- Etapas do meio padrão: `qualificado` (tipo `qualificacao`) e `oportunidade` (tipo `oportunidade`). O nome da oportunidade segue o nicho: Avaliação (estética/clínica), Visita (imobiliário), Orçamento (motos/automóveis), Pedido (restaurante), Oportunidade (outros).
- Motivos de perda, exatamente estes: `preco`, `parou_de_responder`, `sem_interesse`, `comprou_em_outro_lugar`, `fora_do_perfil`, `outro`.
- Conversão das etapas antigas: `agendado` e `proposta_enviada` viram `oportunidade`; `nao_fechou` vira `perdido` com motivo `outro`; `desqualificado` vira `perdido` com motivo `fora_do_perfil`.
- Origem do evento, exatamente uma destas: `portal | axven | sync | sistema`.
- Venda exige valor maior que zero. Moeda em `BRL | USD | EUR` (padrão `BRL`). Data padrão é agora.
- Nada de chave ou segredo no código, no cofre ou no chat.
- Não mexer em `aquisicao_axven_*`, `/pipeline`, `/analise` nem em `leads_comerciais` (o CRM da própria Axven é outro fluxo).
- Textos para o usuário em português, sem jargão técnico.

## Review Focus

1. **O n8n (agente de IA) continua mandando etapas antigas** (`agendado`, `desqualificado`) depois da migração. Tem que virar `oportunidade` ou `perdido` com motivo, e não pode dar erro. Coberto pelo teste TS da Task 1 (`normalizarEtapaLegada`) e pelo T6/T6b do SQL da Task 2.
2. **Usuário do portal do cliente A tentando alterar leads do cliente B** pela gravação direta do navegador. A RLS tem que limitar às linhas dele. Coberto pelo T14 do SQL da Task 2.
3. **Venda sem valor vinda de qualquer escritor** (n8n ou gravação direta). O banco recusa, e a rota responde 400 com mensagem clara, não 500. Coberto pelo T7 do SQL da Task 2 e pelo teste de `traduzirErroEtapa` da Task 1.
4. **Valor digitado no formato brasileiro** ("2.500,50" ou "R$ 1.200,00") chegando às rotas. Tem que virar 2500.5 e 1200. Coberto pelo teste de `lerValorMonetario` da Task 1.
5. **Cliente novo cadastrado depois da migração.** Ele precisa ganhar as 5 etapas sozinho, senão o primeiro lead dele é recusado com `etapa_invalida`. Coberto pelo T5 do SQL da Task 2.

---

## Preparação (antes da Task 1)

- [ ] Criar a branch de trabalho a partir da `master` atualizada:

```bash
cd "C:/Users/Junior/Desktop/AXVEN/ORCA/axven"
git checkout master && git pull --ff-only
git checkout -b feat/painel-axven-base
```

- [ ] Confirmar que os testes existentes passam antes de mexer:

```bash
npm run test:dashboard-executiva && npm run test:dashboard-executiva-saude
```
Esperado: todos `pass`.

---

### Task 1: Módulo de regras do funil (`app/lib/leadEtapas.ts`)

**Files:**
- Create: `app/lib/leadEtapas.ts`
- Create: `tests/lead-etapas.test.mjs`
- Modify: `package.json` (bloco `scripts`)

**Interfaces:**
- Consumes: nada.
- Produces (usado pelas Tasks 3, 4 e 5):
  - `type TipoEtapa = "novo" | "qualificacao" | "oportunidade" | "venda" | "perdido"`
  - `type EtapaCliente = { chave: string; nome: string; tipo: TipoEtapa; ordem: number }`
  - `const ETAPA_NOVO = "lead"`, `const ETAPA_VENDA = "fechado"`, `const ETAPA_PERDIDO = "perdido"`
  - `const MOTIVOS_PERDA: readonly { chave: MotivoPerda; rotulo: string }[]` e `type MotivoPerda`
  - `normalizarEtapaLegada(etapa: string): { etapa: string; motivo: MotivoPerda | null }`
  - `ordenarEtapas(etapas: EtapaCliente[]): EtapaCliente[]`
  - `lerValorMonetario(valor: unknown): number | null`
  - `type PedidoMudancaEtapa = { etapa: string; valor: number | null; moeda: string | null; dataConversao: string | null; motivo: MotivoPerda | null; motivoDetalhe: string | null }`
  - `interpretarMudancaEtapa(body: unknown, agora?: Date): { ok: true; pedido: PedidoMudancaEtapa } | { ok: false; erro: string }`
  - `traduzirErroEtapa(mensagemBanco: string | null | undefined): { status: number; mensagem: string }`
  - `type OrigemEtapa = "portal" | "axven" | "sync" | "sistema"`
  - `paramsRpcEtapa(leadId: string, clienteId: string | null, pedido: PedidoMudancaEtapa, origem: OrigemEtapa, autorUserId: string | null): Record<string, unknown>`, que devolve as chaves `p_lead_id, p_cliente_id, p_etapa, p_valor, p_moeda, p_data_conversao, p_motivo, p_motivo_detalhe, p_origem, p_autor_user_id`

- [ ] **Step 1: Escrever os testes que falham** em `tests/lead-etapas.test.mjs`

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  ETAPA_PERDIDO,
  ETAPA_VENDA,
  MOTIVOS_PERDA,
  interpretarMudancaEtapa,
  lerValorMonetario,
  normalizarEtapaLegada,
  ordenarEtapas,
  paramsRpcEtapa,
  traduzirErroEtapa,
} from "../app/lib/leadEtapas.ts";

const AGORA = new Date("2026-09-29T15:00:00.000Z");

test("etapas antigas viram as novas, com motivo quando é perda", () => {
  assert.deepEqual(normalizarEtapaLegada("agendado"), { etapa: "oportunidade", motivo: null });
  assert.deepEqual(normalizarEtapaLegada("proposta_enviada"), { etapa: "oportunidade", motivo: null });
  assert.deepEqual(normalizarEtapaLegada("nao_fechou"), { etapa: "perdido", motivo: "outro" });
  assert.deepEqual(normalizarEtapaLegada("desqualificado"), { etapa: "perdido", motivo: "fora_do_perfil" });
  assert.deepEqual(normalizarEtapaLegada("visita_feita"), { etapa: "visita_feita", motivo: null });
});

test("lista de motivos de perda é exatamente a aprovada", () => {
  assert.deepEqual(MOTIVOS_PERDA.map((m) => m.chave), [
    "preco", "parou_de_responder", "sem_interesse", "comprou_em_outro_lugar", "fora_do_perfil", "outro",
  ]);
});

test("ordenação: Novo primeiro, etapas do meio pela ordem, Venda e Perdido no fim", () => {
  const etapas = [
    { chave: "perdido", nome: "Perdido", tipo: "perdido", ordem: 100 },
    { chave: "oportunidade", nome: "Visita", tipo: "oportunidade", ordem: 30 },
    { chave: "fechado", nome: "Venda", tipo: "venda", ordem: 90 },
    { chave: "lead", nome: "Novo", tipo: "novo", ordem: 10 },
    { chave: "qualificado", nome: "Qualificado", tipo: "qualificacao", ordem: 20 },
  ];
  assert.deepEqual(ordenarEtapas(etapas).map((e) => e.chave), ["lead", "qualificado", "oportunidade", "fechado", "perdido"]);
});

test("valor em formato brasileiro, com R$ e com ponto decimal", () => {
  assert.equal(lerValorMonetario("2.500,50"), 2500.5);
  assert.equal(lerValorMonetario("R$ 1.200,00"), 1200);
  assert.equal(lerValorMonetario("1500.75"), 1500.75);
  assert.equal(lerValorMonetario(980), 980);
  assert.equal(lerValorMonetario("0"), null);
  assert.equal(lerValorMonetario("-10"), null);
  assert.equal(lerValorMonetario("abc"), null);
  assert.equal(lerValorMonetario(undefined), null);
});

test("venda exige valor e preenche moeda e data padrão", () => {
  assert.deepEqual(interpretarMudancaEtapa({ etapa: "fechado" }, AGORA), { ok: false, erro: "Informe o valor da venda." });
  const r = interpretarMudancaEtapa({ etapa: "fechado", valor: "1.850,456" }, AGORA);
  assert.equal(r.ok, true);
  assert.deepEqual(r.pedido, {
    etapa: ETAPA_VENDA, valor: 1850.46, moeda: "BRL", dataConversao: "2026-09-29T15:00:00.000Z", motivo: null, motivoDetalhe: null,
  });
});

test("venda com moeda ou data inválida é recusada", () => {
  assert.equal(interpretarMudancaEtapa({ etapa: "fechado", valor: 10, moeda: "ARS" }, AGORA).erro, "Moeda inválida.");
  assert.equal(interpretarMudancaEtapa({ etapa: "fechado", valor: 10, data_conversao: "ontem" }, AGORA).erro, "Data da venda inválida.");
});

test("perda exige motivo da lista; etapa antiga desqualificado já traz o motivo", () => {
  assert.equal(interpretarMudancaEtapa({ etapa: "perdido" }, AGORA).erro, "Escolha o motivo da perda.");
  assert.equal(interpretarMudancaEtapa({ etapa: "perdido", motivo: "caro" }, AGORA).erro, "Escolha o motivo da perda.");
  const r = interpretarMudancaEtapa({ etapa: "perdido", motivo: "preco", motivo_detalhe: "  achou caro  " }, AGORA);
  assert.deepEqual(r.pedido, { etapa: ETAPA_PERDIDO, valor: null, moeda: null, dataConversao: null, motivo: "preco", motivoDetalhe: "achou caro" });
  const legado = interpretarMudancaEtapa({ etapa: "desqualificado" }, AGORA);
  assert.equal(legado.pedido.etapa, "perdido");
  assert.equal(legado.pedido.motivo, "fora_do_perfil");
});

test("etapa vazia ou fora do formato é recusada; etapa personalizada passa", () => {
  assert.equal(interpretarMudancaEtapa({}, AGORA).erro, "Informe a etapa.");
  assert.equal(interpretarMudancaEtapa({ etapa: "Visita Feita!" }, AGORA).erro, "Etapa inválida.");
  assert.equal(interpretarMudancaEtapa({ etapa: "visita_feita" }, AGORA).pedido.etapa, "visita_feita");
  assert.equal(interpretarMudancaEtapa(null, AGORA).erro, "Informe a etapa.");
});

test("erros do banco viram mensagem clara com status certo", () => {
  assert.deepEqual(traduzirErroEtapa("valor_venda_obrigatorio"), { status: 400, mensagem: "Informe o valor da venda." });
  assert.deepEqual(traduzirErroEtapa("motivo_perda_obrigatorio"), { status: 400, mensagem: "Escolha o motivo da perda." });
  assert.deepEqual(traduzirErroEtapa("etapa_invalida"), { status: 400, mensagem: "Essa etapa não existe no funil deste cliente." });
  assert.deepEqual(traduzirErroEtapa("lead_nao_encontrado"), { status: 404, mensagem: "Lead não encontrado." });
  assert.deepEqual(traduzirErroEtapa("connection reset"), { status: 500, mensagem: "Não foi possível atualizar o lead." });
});

test("parâmetros da RPC saem com os nomes que o banco espera", () => {
  const r = interpretarMudancaEtapa({ etapa: "perdido", motivo: "preco" }, AGORA);
  assert.deepEqual(paramsRpcEtapa("L1", "C1", r.pedido, "portal", "U1"), {
    p_lead_id: "L1", p_cliente_id: "C1", p_etapa: "perdido", p_valor: null, p_moeda: null, p_data_conversao: null,
    p_motivo: "preco", p_motivo_detalhe: null, p_origem: "portal", p_autor_user_id: "U1",
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/lead-etapas.test.mjs`
Esperado: FAIL com `Cannot find module` apontando para `app/lib/leadEtapas.ts`.

- [ ] **Step 3: Implementar `app/lib/leadEtapas.ts`**

```ts
// Regras do funil de leads dos clientes (Painel Axven · Entrega 1).
// Sem imports com alias ("@/…"), para poder ser testado direto com `node --test`.
// As mesmas regras valem no banco (gatilho leads_validar_etapa_trg); aqui elas
// servem para responder rápido e com mensagem clara antes de chamar o banco.

export type TipoEtapa = "novo" | "qualificacao" | "oportunidade" | "venda" | "perdido";

export type EtapaCliente = { chave: string; nome: string; tipo: TipoEtapa; ordem: number };

export const ETAPA_NOVO = "lead";
export const ETAPA_VENDA = "fechado";
export const ETAPA_PERDIDO = "perdido";

export const MOTIVOS_PERDA = [
  { chave: "preco", rotulo: "Preço" },
  { chave: "parou_de_responder", rotulo: "Parou de responder" },
  { chave: "sem_interesse", rotulo: "Sem interesse" },
  { chave: "comprou_em_outro_lugar", rotulo: "Comprou em outro lugar" },
  { chave: "fora_do_perfil", rotulo: "Fora do perfil" },
  { chave: "outro", rotulo: "Outro" },
] as const;

export type MotivoPerda = (typeof MOTIVOS_PERDA)[number]["chave"];

export type OrigemEtapa = "portal" | "axven" | "sync" | "sistema";

export type PedidoMudancaEtapa = {
  etapa: string;
  valor: number | null;
  moeda: string | null;
  dataConversao: string | null;
  motivo: MotivoPerda | null;
  motivoDetalhe: string | null;
};

const MOTIVOS = new Set<string>(MOTIVOS_PERDA.map((motivo) => motivo.chave));
const MOEDAS = new Set(["BRL", "USD", "EUR"]);
const CHAVE_ETAPA = /^[a-z][a-z0-9_]{1,39}$/;

const LEGADO: Record<string, { etapa: string; motivo: MotivoPerda | null }> = {
  agendado: { etapa: "oportunidade", motivo: null },
  proposta_enviada: { etapa: "oportunidade", motivo: null },
  nao_fechou: { etapa: ETAPA_PERDIDO, motivo: "outro" },
  desqualificado: { etapa: ETAPA_PERDIDO, motivo: "fora_do_perfil" },
};

export function normalizarEtapaLegada(etapa: string): { etapa: string; motivo: MotivoPerda | null } {
  return LEGADO[etapa] ?? { etapa, motivo: null };
}

const PESO_TIPO: Record<TipoEtapa, number> = { novo: 0, qualificacao: 1, oportunidade: 1, venda: 2, perdido: 3 };

export function ordenarEtapas(etapas: EtapaCliente[]): EtapaCliente[] {
  return [...etapas].sort((a, b) => PESO_TIPO[a.tipo] - PESO_TIPO[b.tipo] || a.ordem - b.ordem);
}

export function lerValorMonetario(valor: unknown): number | null {
  if (typeof valor === "number") return Number.isFinite(valor) && valor > 0 ? valor : null;
  if (typeof valor !== "string") return null;
  const limpo = valor.trim().replace(/^R\$\s*/i, "");
  if (!limpo) return null;
  const normalizado = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const numero = Number(normalizado);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

export function interpretarMudancaEtapa(
  body: unknown,
  agora: Date = new Date(),
): { ok: true; pedido: PedidoMudancaEtapa } | { ok: false; erro: string } {
  const dados = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const bruta = typeof dados.etapa === "string" ? dados.etapa.trim() : "";
  if (!bruta) return { ok: false, erro: "Informe a etapa." };

  const { etapa, motivo: motivoLegado } = normalizarEtapaLegada(bruta);
  if (!CHAVE_ETAPA.test(etapa)) return { ok: false, erro: "Etapa inválida." };

  const pedido: PedidoMudancaEtapa = { etapa, valor: null, moeda: null, dataConversao: null, motivo: null, motivoDetalhe: null };

  if (etapa === ETAPA_VENDA) {
    const valor = lerValorMonetario(dados.valor);
    if (valor === null) return { ok: false, erro: "Informe o valor da venda." };
    const moeda = typeof dados.moeda === "string" && dados.moeda.trim() ? dados.moeda.trim().toUpperCase() : "BRL";
    if (!MOEDAS.has(moeda)) return { ok: false, erro: "Moeda inválida." };
    const dataTexto = typeof dados.data_conversao === "string" ? dados.data_conversao.trim() : "";
    const data = dataTexto ? new Date(dataTexto) : agora;
    if (Number.isNaN(data.getTime())) return { ok: false, erro: "Data da venda inválida." };
    pedido.valor = Math.round(valor * 100) / 100;
    pedido.moeda = moeda;
    pedido.dataConversao = data.toISOString();
  }

  if (etapa === ETAPA_PERDIDO) {
    const informado = typeof dados.motivo === "string" ? dados.motivo.trim() : "";
    const motivo = informado || motivoLegado;
    if (!motivo || !MOTIVOS.has(motivo)) return { ok: false, erro: "Escolha o motivo da perda." };
    pedido.motivo = motivo as MotivoPerda;
    const detalhe = typeof dados.motivo_detalhe === "string" ? dados.motivo_detalhe.trim().slice(0, 500) : "";
    pedido.motivoDetalhe = detalhe || null;
  }

  return { ok: true, pedido };
}

const ERROS_BANCO: Record<string, { status: number; mensagem: string }> = {
  etapa_invalida: { status: 400, mensagem: "Essa etapa não existe no funil deste cliente." },
  valor_venda_obrigatorio: { status: 400, mensagem: "Informe o valor da venda." },
  motivo_perda_obrigatorio: { status: 400, mensagem: "Escolha o motivo da perda." },
  lead_nao_encontrado: { status: 404, mensagem: "Lead não encontrado." },
};

export function traduzirErroEtapa(mensagemBanco: string | null | undefined): { status: number; mensagem: string } {
  const texto = mensagemBanco ?? "";
  const chave = Object.keys(ERROS_BANCO).find((codigo) => texto.includes(codigo));
  return chave ? ERROS_BANCO[chave] : { status: 500, mensagem: "Não foi possível atualizar o lead." };
}

export function paramsRpcEtapa(
  leadId: string,
  clienteId: string | null,
  pedido: PedidoMudancaEtapa,
  origem: OrigemEtapa,
  autorUserId: string | null,
): Record<string, unknown> {
  return {
    p_lead_id: leadId,
    p_cliente_id: clienteId,
    p_etapa: pedido.etapa,
    p_valor: pedido.valor,
    p_moeda: pedido.moeda,
    p_data_conversao: pedido.dataConversao,
    p_motivo: pedido.motivo,
    p_motivo_detalhe: pedido.motivoDetalhe,
    p_origem: origem,
    p_autor_user_id: autorUserId,
  };
}
```

- [ ] **Step 4: Adicionar o script e rodar até passar**

Em `package.json`, dentro de `"scripts"`, depois de `"test:meta-sync-cron"`, adicionar:

```json
    "test:lead-etapas": "node --test tests/lead-etapas.test.mjs"
```
(lembrar da vírgula no fim da linha anterior)

Run: `npm run test:lead-etapas`
Esperado: 10 testes `pass`, 0 `fail`.

- [ ] **Step 5: Commit**

```bash
git add app/lib/leadEtapas.ts tests/lead-etapas.test.mjs package.json
git commit -m "feat(crm): regras do funil configurável por cliente em módulo único

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Banco: etapas por cliente, histórico, validação e conversão das etapas antigas

**Files:**
- Create: `supabase/migrations/20260929180000_painel_axven_etapas_base.sql`
- Create: `supabase/migrations/20260929180100_painel_axven_migrar_etapas.sql`
- Create: `supabase/tests/painel_axven_etapas.test.sql`

**Interfaces:**
- Consumes: tabelas existentes `clientes`, `leads`, `crm_usuarios` e `auth.users`.
- Produces (usado pelas Tasks 3 e 4; ainda não aplicado em produção, o que só acontece na Task 6):
  - Tabela `public.cliente_etapas(id, cliente_id, chave, nome, tipo, ordem, ativo, criado_em)`, legível pelo usuário do portal só para o próprio cliente.
  - Tabela `public.lead_etapa_eventos(id, lead_id, cliente_id, etapa_anterior, etapa_nova, valor, motivo, autor_user_id, origem, criado_em)`.
  - Colunas novas em `leads`: `motivo_perda`, `motivo_perda_detalhe`, `etapa_alterada_em`, `origem_tabela` e `origem_id`.
  - Colunas novas em `clientes`: `whatstracker_tabela` e `capi_origem`. Em `crm_usuarios`: `nome`, `whatsapp`, `papel` e `recebe_lembrete`.
  - RPC `public.atualizar_etapa_lead_v1(p_lead_id uuid, p_cliente_id uuid, p_etapa text, p_valor numeric, p_moeda text, p_data_conversao timestamptz, p_motivo text, p_motivo_detalhe text, p_origem text, p_autor_user_id uuid) returns public.leads`, executável só por `service_role`.
  - Erros levantados pelo banco (texto da mensagem): `etapa_invalida`, `valor_venda_obrigatorio`, `motivo_perda_obrigatorio`, `lead_nao_encontrado` e `origem_invalida`.

- [ ] **Step 1: Escrever o teste SQL que falha** em `supabase/tests/painel_axven_etapas.test.sql`

Este arquivo **só pode rodar dentro de `begin; … rollback;`**, porque cria dados de teste. Ele espera que exista a tabela temporária `_antes` (criada no ensaio do Step 2).

```sql
-- Testes do Painel Axven · Entrega 1. Rodar SEMPRE dentro de: begin; ... rollback;
-- Pré-requisito no mesmo bloco: create temp table _antes as select (select count(*) from public.leads) as leads;

do $$
declare
  v_cliente uuid;
  v_lead uuid;
  v_n int;
  v_txt text;
  v_ok boolean;
  v_row public.leads;
  v_evento public.lead_etapa_eventos;
begin
  -- T1: todo cliente tem as 5 etapas padrão
  select count(*) into v_n from public.clientes c
  where (select count(*) from public.cliente_etapas e where e.cliente_id = c.id) < 5;
  if v_n <> 0 then raise exception 'T1 FALHOU: % clientes sem as 5 etapas', v_n; end if;

  -- T2: o nome da oportunidade segue o nicho (Camilo, imobiliário = Visita)
  select e.nome into v_txt from public.cliente_etapas e join public.clientes c on c.id = e.cliente_id
  where c.nome = 'Camilo Imóveis' and e.chave = 'oportunidade';
  if v_txt is distinct from 'Visita' then raise exception 'T2 FALHOU: oportunidade do Camilo = %', v_txt; end if;

  -- T3: nenhum lead ficou fora do funil do cliente, e nenhum lead sumiu
  select count(*) into v_n from public.leads l
  where not exists (select 1 from public.cliente_etapas e where e.cliente_id = l.cliente_id and e.chave = l.etapa and e.ativo);
  if v_n <> 0 then raise exception 'T3 FALHOU: % leads com etapa inválida', v_n; end if;
  select count(*) into v_n from public.leads;
  if v_n <> (select leads from _antes) then raise exception 'T3 FALHOU: % leads depois, % antes', v_n, (select leads from _antes); end if;

  -- T4: todo lead tem evento de entrada, e as etapas antigas sumiram
  select count(*) into v_n from public.leads l
  where not exists (select 1 from public.lead_etapa_eventos e where e.lead_id = l.id and e.etapa_anterior is null);
  if v_n <> 0 then raise exception 'T4 FALHOU: % leads sem evento de entrada', v_n; end if;
  select count(*) into v_n from public.leads where etapa in ('agendado','proposta_enviada','nao_fechou','desqualificado');
  if v_n <> 0 then raise exception 'T4 FALHOU: % leads ainda em etapa antiga', v_n; end if;

  -- T5: cliente novo ganha as 5 etapas sozinho, e o lead novo ganha evento de entrada
  insert into public.clientes (nome, nicho, status_pagamento) values ('Cliente Teste Plano', 'Imobiliário', 'em_dia')
  returning id into v_cliente;
  select count(*) into v_n from public.cliente_etapas where cliente_id = v_cliente;
  if v_n <> 5 then raise exception 'T5 FALHOU: cliente novo com % etapas', v_n; end if;
  insert into public.leads (nome, telefone, cliente_id) values ('Lead Teste', '5581999990000', v_cliente) returning id into v_lead;
  select count(*) into v_n from public.lead_etapa_eventos where lead_id = v_lead and etapa_anterior is null and etapa_nova = 'lead';
  if v_n <> 1 then raise exception 'T5 FALHOU: % eventos de entrada para o lead novo', v_n; end if;

  -- T6: quem ainda grava "agendado" (n8n antigo) cai em "oportunidade" e marca qualificado
  update public.leads set etapa = 'agendado' where id = v_lead returning * into v_row;
  if v_row.etapa <> 'oportunidade' or not v_row.qualificado then
    raise exception 'T6 FALHOU: etapa=% qualificado=%', v_row.etapa, v_row.qualificado;
  end if;

  -- T6b: quem grava "desqualificado" cai em "perdido" com motivo fora_do_perfil
  update public.leads set etapa = 'desqualificado' where id = v_lead returning * into v_row;
  if v_row.etapa <> 'perdido' or v_row.motivo_perda is distinct from 'fora_do_perfil' then
    raise exception 'T6b FALHOU: etapa=% motivo=%', v_row.etapa, v_row.motivo_perda;
  end if;

  -- T7: venda sem valor é recusada
  v_ok := false;
  begin
    update public.leads set etapa = 'fechado', valor_conversao = null where id = v_lead;
  exception when others then
    v_ok := sqlerrm like '%valor_venda_obrigatorio%';
  end;
  if not v_ok then raise exception 'T7 FALHOU: venda sem valor não foi recusada corretamente'; end if;

  -- T8: sair de Perdido limpa o motivo; voltar para Perdido sem motivo é recusado
  update public.leads set etapa = 'qualificado' where id = v_lead returning * into v_row;
  if v_row.motivo_perda is not null then raise exception 'T8 FALHOU: motivo não foi limpo (%)', v_row.motivo_perda; end if;
  v_ok := false;
  begin
    update public.leads set etapa = 'perdido' where id = v_lead;
  exception when others then
    v_ok := sqlerrm like '%motivo_perda_obrigatorio%';
  end;
  if not v_ok then raise exception 'T8 FALHOU: perda sem motivo não foi recusada corretamente'; end if;

  -- T9: etapa que não existe no funil do cliente é recusada
  v_ok := false;
  begin
    update public.leads set etapa = 'visita_feita' where id = v_lead;
  exception when others then
    v_ok := sqlerrm like '%etapa_invalida%';
  end;
  if not v_ok then raise exception 'T9 FALHOU: etapa inexistente não foi recusada'; end if;

  -- T10: a RPC registra venda com valor arredondado, origem e autor
  v_row := public.atualizar_etapa_lead_v1(v_lead, v_cliente, 'fechado', 1500.456, 'BRL', now(), null, null, 'axven', null);
  if v_row.etapa <> 'fechado' or v_row.valor_conversao <> 1500.46 then
    raise exception 'T10 FALHOU: etapa=% valor=%', v_row.etapa, v_row.valor_conversao;
  end if;
  select * into v_evento from public.lead_etapa_eventos where lead_id = v_lead order by criado_em desc, id desc limit 1;
  if v_evento.etapa_nova <> 'fechado' or v_evento.valor <> 1500.46 or v_evento.origem <> 'axven' then
    raise exception 'T10 FALHOU: evento=% valor=% origem=%', v_evento.etapa_nova, v_evento.valor, v_evento.origem;
  end if;
  if current_setting('axven.origem', true) is distinct from '' then
    raise exception 'T10 FALHOU: RPC deixou axven.origem = %', current_setting('axven.origem', true);
  end if;

  -- T11: a RPC não acha lead de outro cliente
  v_ok := false;
  begin
    perform public.atualizar_etapa_lead_v1(v_lead, gen_random_uuid(), 'qualificado');
  exception when others then
    v_ok := sqlerrm like '%lead_nao_encontrado%';
  end;
  if not v_ok then raise exception 'T11 FALHOU: RPC alterou lead passando outro cliente'; end if;

  -- T12: repetir a mesma etapa não cria evento duplicado
  select count(*) into v_n from public.lead_etapa_eventos where lead_id = v_lead;
  perform public.atualizar_etapa_lead_v1(v_lead, v_cliente, 'fechado', 1500.46, 'BRL', now(), null, null, 'axven', null);
  if (select count(*) from public.lead_etapa_eventos where lead_id = v_lead) <> v_n then
    raise exception 'T12 FALHOU: evento duplicado para a mesma etapa';
  end if;

  -- T13: origem inválida é recusada
  v_ok := false;
  begin
    perform public.atualizar_etapa_lead_v1(v_lead, v_cliente, 'qualificado', null, null, null, null, null, 'n8n', null);
  exception when others then
    v_ok := sqlerrm like '%origem_invalida%';
  end;
  if not v_ok then raise exception 'T13 FALHOU: origem inválida aceita'; end if;
end $$;

-- T14/T15: o usuário do portal só alcança os leads e as etapas do próprio cliente (RLS)
insert into auth.users (id, email, aud, role)
values ('00000000-0000-4000-8000-00000000a001', 'teste-plano@axven.invalid', 'authenticated', 'authenticated');
insert into public.crm_usuarios (user_id, cliente_id)
select '00000000-0000-4000-8000-00000000a001', id from public.clientes where nome = 'Cliente Teste Plano';

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000a001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare v_n int;
begin
  with alterados as (update public.leads set atualizado_em = now() returning id)
  select count(*) into v_n from alterados;
  if v_n <> 1 then raise exception 'T14 FALHOU: usuário do portal alcançou % leads (esperado 1)', v_n; end if;

  update public.leads set etapa = 'oportunidade' where nome = 'Lead Teste';

  select count(*) into v_n from public.cliente_etapas;
  if v_n <> 5 then raise exception 'T15 FALHOU: portal vê % etapas (esperado 5)', v_n; end if;
end $$;

reset role;
select set_config('request.jwt.claims', '', true);

-- T16: a mudança feita pelo portal fica registrada com origem portal e o autor
do $$
declare v_evento public.lead_etapa_eventos;
begin
  select e.* into v_evento from public.lead_etapa_eventos e
  join public.leads l on l.id = e.lead_id
  where l.nome = 'Lead Teste'
  order by e.criado_em desc, e.id desc limit 1;
  if v_evento.etapa_nova <> 'oportunidade' or v_evento.origem <> 'portal'
     or v_evento.autor_user_id is distinct from '00000000-0000-4000-8000-00000000a001'::uuid then
    raise exception 'T16 FALHOU: etapa=% origem=% autor=%', v_evento.etapa_nova, v_evento.origem, v_evento.autor_user_id;
  end if;
end $$;

select 'TODOS OS TESTES PASSARAM' as resultado;
```

- [ ] **Step 2: Rodar o teste sem as migrações e ver falhar**

Use a ferramenta `execute_sql` do conector Supabase no projeto `ljexwrcevetpysmwjtyq`, com esta consulta: `begin;` + `create temp table _antes as select (select count(*) from public.leads) as leads;` + o conteúdo inteiro de `supabase/tests/painel_axven_etapas.test.sql` + `rollback;`.
Esperado: erro `relation "public.cliente_etapas" does not exist`.

- [ ] **Step 3: Escrever a migração de estrutura** `supabase/migrations/20260929180000_painel_axven_etapas_base.sql`

```sql
-- Painel Axven · Entrega 1 (Base): etapas configuráveis por cliente, histórico de etapas e motivos de perda.
-- Spec: docs/superpowers/specs/2026-09-29-painel-axven-design.md (seção 4.2).
-- As regras ficam no banco para valerem para qualquer escritor: portal (RLS), rotas do Next e n8n.

-- 1) Etapas de cada cliente ---------------------------------------------------
create table if not exists public.cliente_etapas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  chave text not null,
  nome text not null,
  tipo text not null,
  ordem integer not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  constraint cliente_etapas_chave_unica unique (cliente_id, chave),
  constraint cliente_etapas_chave_formato check (chave ~ '^[a-z][a-z0-9_]{1,39}$'),
  constraint cliente_etapas_nome_check check (length(trim(nome)) between 1 and 40),
  constraint cliente_etapas_tipo_check check (tipo in ('novo','qualificacao','oportunidade','venda','perdido')),
  constraint cliente_etapas_fixas_check check (
    (chave = 'lead' and tipo = 'novo' and ativo)
    or (chave = 'fechado' and tipo = 'venda' and ativo)
    or (chave = 'perdido' and tipo = 'perdido' and ativo)
    or (chave not in ('lead','fechado','perdido') and tipo in ('qualificacao','oportunidade'))
  )
);

alter table public.cliente_etapas enable row level security;
revoke all on table public.cliente_etapas from public, anon, authenticated;
grant select on table public.cliente_etapas to authenticated;
drop policy if exists "crm_usuario_ve_etapas_do_proprio_cliente" on public.cliente_etapas;
create policy "crm_usuario_ve_etapas_do_proprio_cliente"
on public.cliente_etapas for select to authenticated
using (cliente_id in (select cu.cliente_id from public.crm_usuarios cu where cu.user_id = (select auth.uid())));

create or replace function public.nome_oportunidade_por_nicho(p_nicho text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when p_nicho ilike '%imobili%' then 'Visita'
    when p_nicho ilike '%autom%' or p_nicho ilike '%moto%' then 'Orçamento'
    when p_nicho ilike '%restaurante%' or p_nicho ilike '%delivery%' then 'Pedido'
    when p_nicho ilike '%est_tica%' or p_nicho ilike '%cl_nica%' then 'Avaliação'
    else 'Oportunidade'
  end
$$;

create or replace function public.semear_etapas_cliente_v1(p_cliente_id uuid, p_nicho text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.cliente_etapas (cliente_id, chave, nome, tipo, ordem) values
    (p_cliente_id, 'lead', 'Novo', 'novo', 10),
    (p_cliente_id, 'qualificado', 'Qualificado', 'qualificacao', 20),
    (p_cliente_id, 'oportunidade', public.nome_oportunidade_por_nicho(p_nicho), 'oportunidade', 30),
    (p_cliente_id, 'fechado', 'Venda', 'venda', 90),
    (p_cliente_id, 'perdido', 'Perdido', 'perdido', 100)
  on conflict (cliente_id, chave) do nothing;
$$;
revoke all on function public.semear_etapas_cliente_v1(uuid, text) from public, anon, authenticated;

create or replace function public.clientes_semear_etapas_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.semear_etapas_cliente_v1(new.id, new.nicho);
  return null;
end;
$$;

drop trigger if exists clientes_semear_etapas on public.clientes;
create trigger clientes_semear_etapas
after insert on public.clientes
for each row execute function public.clientes_semear_etapas_trg();

select public.semear_etapas_cliente_v1(c.id, c.nicho) from public.clientes c;

-- 2) Colunas novas ----------------------------------------------------------------
alter table public.leads
  add column if not exists motivo_perda text,
  add column if not exists motivo_perda_detalhe text,
  add column if not exists etapa_alterada_em timestamptz,
  add column if not exists origem_tabela text,
  add column if not exists origem_id text;

alter table public.leads drop constraint if exists leads_etapa_check;
alter table public.leads drop constraint if exists leads_motivo_perda_check;
alter table public.leads add constraint leads_motivo_perda_check check (
  motivo_perda is null
  or motivo_perda in ('preco','parou_de_responder','sem_interesse','comprou_em_outro_lugar','fora_do_perfil','outro')
);
alter table public.leads drop constraint if exists leads_motivo_detalhe_check;
alter table public.leads add constraint leads_motivo_detalhe_check check (
  motivo_perda_detalhe is null or length(motivo_perda_detalhe) <= 500
);
create unique index if not exists leads_cliente_origem_uniq
  on public.leads (cliente_id, origem_tabela, origem_id) where origem_id is not null;
update public.leads set etapa_alterada_em = coalesce(atualizado_em, criado_em, now()) where etapa_alterada_em is null;

alter table public.clientes
  add column if not exists whatstracker_tabela text,
  add column if not exists capi_origem text not null default 'whatstracker';
alter table public.clientes drop constraint if exists clientes_capi_origem_check;
alter table public.clientes add constraint clientes_capi_origem_check check (capi_origem in ('whatstracker','axven'));
create unique index if not exists clientes_whatstracker_tabela_uniq
  on public.clientes (whatstracker_tabela) where whatstracker_tabela is not null;

alter table public.crm_usuarios
  add column if not exists nome text,
  add column if not exists whatsapp text,
  add column if not exists papel text not null default 'atendente',
  add column if not exists recebe_lembrete boolean not null default false;
alter table public.crm_usuarios drop constraint if exists crm_usuarios_papel_check;
alter table public.crm_usuarios add constraint crm_usuarios_papel_check check (papel in ('dono','atendente'));
alter table public.crm_usuarios drop constraint if exists crm_usuarios_whatsapp_check;
alter table public.crm_usuarios add constraint crm_usuarios_whatsapp_check check (whatsapp is null or whatsapp ~ '^[0-9]{10,15}$');

-- 3) Histórico de etapas ---------------------------------------------------------
create table if not exists public.lead_etapa_eventos (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  etapa_anterior text null,
  etapa_nova text not null,
  valor numeric null,
  motivo text null,
  autor_user_id uuid null,
  origem text not null,
  criado_em timestamptz not null default clock_timestamp(),
  constraint lead_etapa_eventos_origem_check check (origem in ('portal','axven','sync','sistema'))
);
create index if not exists idx_lead_etapa_eventos_lead_data on public.lead_etapa_eventos (lead_id, criado_em desc);
create index if not exists idx_lead_etapa_eventos_cliente_data on public.lead_etapa_eventos (cliente_id, criado_em desc);

alter table public.lead_etapa_eventos enable row level security;
revoke all on table public.lead_etapa_eventos from public, anon, authenticated;
grant select on table public.lead_etapa_eventos to authenticated;
drop policy if exists "crm_usuario_ve_eventos_do_proprio_cliente" on public.lead_etapa_eventos;
create policy "crm_usuario_ve_eventos_do_proprio_cliente"
on public.lead_etapa_eventos for select to authenticated
using (cliente_id in (select cu.cliente_id from public.crm_usuarios cu where cu.user_id = (select auth.uid())));

-- 4) Validação da etapa (vale para qualquer escritor) --------------------------
create or replace function public.leads_validar_etapa_trg()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_tipo text;
begin
  -- Etapas antigas (n8n, telas antigas) viram as novas.
  if new.etapa in ('agendado','proposta_enviada') then
    new.etapa := 'oportunidade';
  elsif new.etapa = 'nao_fechou' then
    new.etapa := 'perdido';
    new.motivo_perda := coalesce(new.motivo_perda, 'outro');
  elsif new.etapa = 'desqualificado' then
    new.etapa := 'perdido';
    new.motivo_perda := coalesce(new.motivo_perda, 'fora_do_perfil');
  end if;

  if tg_op = 'UPDATE' and new.etapa is not distinct from old.etapa then
    return new;
  end if;

  select e.tipo into v_tipo
  from public.cliente_etapas e
  where e.cliente_id = new.cliente_id and e.chave = new.etapa and e.ativo;

  if v_tipo is null then
    raise exception using message = 'etapa_invalida', errcode = '22023', detail = coalesce(new.etapa, '(nula)');
  end if;

  if v_tipo = 'venda' then
    if new.valor_conversao is null or new.valor_conversao <= 0 then
      raise exception using message = 'valor_venda_obrigatorio', errcode = '22023';
    end if;
    new.moeda := coalesce(new.moeda, 'BRL');
    new.data_conversao := coalesce(new.data_conversao, now());
  end if;

  if v_tipo = 'perdido' then
    if new.motivo_perda is null then
      raise exception using message = 'motivo_perda_obrigatorio', errcode = '22023';
    end if;
  else
    new.motivo_perda := null;
    new.motivo_perda_detalhe := null;
  end if;

  if v_tipo in ('qualificacao','oportunidade','venda') then
    new.qualificado := true;
  end if;

  new.etapa_alterada_em := now();
  return new;
end;
$$;

drop trigger if exists leads_10_validar_etapa on public.leads;
create trigger leads_10_validar_etapa
before insert or update of etapa on public.leads
for each row execute function public.leads_validar_etapa_trg();

-- 5) Registro do histórico (vale para qualquer escritor) ------------------------
create or replace function public.leads_registrar_evento_etapa_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_autor uuid;
  v_origem text;
begin
  if tg_op = 'UPDATE' and new.etapa is not distinct from old.etapa then
    return null;
  end if;

  v_autor := coalesce(nullif(current_setting('axven.autor_user_id', true), '')::uuid, auth.uid());
  v_origem := coalesce(
    nullif(current_setting('axven.origem', true), ''),
    case when auth.uid() is not null then 'portal' else 'sistema' end
  );

  insert into public.lead_etapa_eventos (lead_id, cliente_id, etapa_anterior, etapa_nova, valor, motivo, autor_user_id, origem)
  values (
    new.id,
    new.cliente_id,
    case when tg_op = 'UPDATE' then old.etapa end,
    new.etapa,
    case when new.etapa = 'fechado' then new.valor_conversao end,
    case when new.etapa = 'perdido' then new.motivo_perda end,
    v_autor,
    v_origem
  );
  return null;
end;
$$;

drop trigger if exists leads_20_registrar_evento_etapa on public.leads;
create trigger leads_20_registrar_evento_etapa
after insert or update of etapa on public.leads
for each row execute function public.leads_registrar_evento_etapa_trg();

-- 6) RPC usada pelas rotas do servidor (informa origem e autor) ------------------
create or replace function public.atualizar_etapa_lead_v1(
  p_lead_id uuid,
  p_cliente_id uuid,
  p_etapa text,
  p_valor numeric default null,
  p_moeda text default null,
  p_data_conversao timestamptz default null,
  p_motivo text default null,
  p_motivo_detalhe text default null,
  p_origem text default 'axven',
  p_autor_user_id uuid default null
)
returns public.leads
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lead public.leads;
begin
  if p_origem is null or p_origem not in ('portal','axven','sync','sistema') then
    raise exception using message = 'origem_invalida', errcode = '22023';
  end if;

  perform set_config('axven.origem', p_origem, true);
  perform set_config('axven.autor_user_id', coalesce(p_autor_user_id::text, ''), true);

  update public.leads
  set etapa = p_etapa,
      valor_conversao = coalesce(round(p_valor, 2), valor_conversao),
      moeda = coalesce(p_moeda, moeda),
      data_conversao = coalesce(p_data_conversao, data_conversao),
      motivo_perda = coalesce(p_motivo, motivo_perda),
      motivo_perda_detalhe = coalesce(nullif(trim(p_motivo_detalhe), ''), motivo_perda_detalhe),
      atualizado_em = now()
  where id = p_lead_id
    and (p_cliente_id is null or cliente_id = p_cliente_id)
  returning * into v_lead;

  -- Limpa a origem e o autor antes de qualquer retorno ou erro. O teste vem de
  -- v_lead.id, e não de FOUND, porque os `perform` acima alteram o FOUND.
  perform set_config('axven.origem', '', true);
  perform set_config('axven.autor_user_id', '', true);

  if v_lead.id is null then
    raise exception using message = 'lead_nao_encontrado', errcode = 'P0002';
  end if;

  return v_lead;
end;
$$;

revoke all on function public.atualizar_etapa_lead_v1(uuid,uuid,text,numeric,text,timestamptz,text,text,text,uuid) from public, anon, authenticated;
grant execute on function public.atualizar_etapa_lead_v1(uuid,uuid,text,numeric,text,timestamptz,text,text,text,uuid) to service_role;
```

- [ ] **Step 4: Escrever a migração de dados** `supabase/migrations/20260929180100_painel_axven_migrar_etapas.sql`

```sql
-- Painel Axven · Entrega 1: converte as etapas antigas dos leads de clientes para o funil novo
-- e cria a linha de base do histórico (evento de entrada de cada lead que já existia).
-- Os gatilhos de 20260929180000 registram cada conversão com origem 'sistema'.

update public.leads
set etapa = 'oportunidade'
where etapa in ('agendado', 'proposta_enviada');

update public.leads
set etapa = 'perdido',
    motivo_perda = 'outro',
    motivo_perda_detalhe = 'Migrado da etapa antiga "não fechou"'
where etapa = 'nao_fechou';

update public.leads
set etapa = 'perdido',
    motivo_perda = 'fora_do_perfil',
    motivo_perda_detalhe = 'Migrado da etapa antiga "desqualificado"'
where etapa = 'desqualificado';

insert into public.lead_etapa_eventos (lead_id, cliente_id, etapa_anterior, etapa_nova, origem, criado_em)
select l.id, l.cliente_id, null, 'lead', 'sistema', coalesce(l.criado_em, now())
from public.leads l
where not exists (
  select 1 from public.lead_etapa_eventos e where e.lead_id = l.id and e.etapa_anterior is null
);
```

- [ ] **Step 5: Ensaiar migrações + testes sem gravar nada**

`execute_sql` no projeto `ljexwrcevetpysmwjtyq`, com esta consulta, nesta ordem:
1. `begin;`
2. `create temp table _antes as select (select count(*) from public.leads) as leads;`
3. o conteúdo de `20260929180000_painel_axven_etapas_base.sql`
4. o conteúdo de `20260929180100_painel_axven_migrar_etapas.sql`
5. o conteúdo de `supabase/tests/painel_axven_etapas.test.sql`
6. `rollback;`

Esperado: a última linha retornada é `TODOS OS TESTES PASSARAM`. Se aparecer `Tn FALHOU`, corrija a migração e repita.

- [ ] **Step 6: Confirmar que o ensaio não deixou nada no banco**

`execute_sql`: `select to_regclass('public.cliente_etapas') as etapas, to_regclass('public.lead_etapa_eventos') as eventos, (select count(*) from public.leads where etapa = 'oportunidade') as oportunidade;`
Esperado: `etapas = null`, `eventos = null`, `oportunidade = 0`.

- [ ] **Step 7: Commit (sem aplicar em produção, o que só acontece na Task 6)**

```bash
git add supabase/migrations/20260929180000_painel_axven_etapas_base.sql supabase/migrations/20260929180100_painel_axven_migrar_etapas.sql supabase/tests/painel_axven_etapas.test.sql
git commit -m "feat(db): funil configurável por cliente, histórico de etapas e motivos de perda

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Rotas de API passam pela RPC

**Files:**
- Modify: `app/api/webhooks/leads/etapa/route.ts` (arquivo inteiro)
- Modify: `app/api/clientes/[clienteId]/crm/leads/[leadId]/route.ts` (arquivo inteiro)
- Modify: `app/api/crm/leads/[id]/fechar/route.ts` (arquivo inteiro)
- Modify: `app/api/crm/disparos/route.ts:4`
- Create: `tests/painel-axven-base-contratos.test.mjs`
- Modify: `package.json` (scripts)

**Interfaces:**
- Consumes: `interpretarMudancaEtapa`, `paramsRpcEtapa`, `traduzirErroEtapa`, `ETAPA_VENDA` (Task 1) e a RPC `atualizar_etapa_lead_v1` (Task 2).
- Produces (usado pela Task 4): o `PATCH /api/clientes/[clienteId]/crm/leads/[leadId]` aceita `{ etapa, valor?, moeda?, data_conversao?, motivo?, motivo_detalhe? }` ou `{ pausado_ia }` e responde `{ lead }` ou `{ error: string }` já em português. O `POST /api/crm/leads/[id]/fechar` aceita `{ valor, moeda?, data_conversao? }` com `Authorization: Bearer <token>`.

- [ ] **Step 1: Escrever os testes de contrato que falham** em `tests/painel-axven-base-contratos.test.mjs`

```js
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
    assert.match(src, /rpc\("atualizar_etapa_lead_v1"/, `${nome}: não usa a RPC`);
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
```

- [ ] **Step 2: Rodar e ver falhar**

Em `package.json`, adicionar ao `"scripts"`: `"test:painel-axven-base": "node --test tests/painel-axven-base-contratos.test.mjs"`.
Run: `npm run test:painel-axven-base`
Esperado: FAIL em "toda rota que muda etapa usa a RPC".

- [ ] **Step 3: Reescrever `app/api/webhooks/leads/etapa/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { validateWebhookSecret } from "@/app/lib/webhookAuth";
import { interpretarMudancaEtapa, paramsRpcEtapa, traduzirErroEtapa } from "@/app/lib/leadEtapas";

// Chamado pelo workflow n8n do agente de IA depois de ler a conversa de WhatsApp
// e decidir que o lead avançou de etapa no kanban. Continua aceitando as etapas
// antigas (agendado, proposta_enviada, nao_fechou, desqualificado), que viram as novas.
export async function POST(req: NextRequest) {
  const authError = validateWebhookSecret(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "corpo invalido" }, { status: 400 });
  }

  const leadId = typeof body.lead_id === "string" ? body.lead_id : "";
  if (!leadId || typeof body.etapa !== "string") {
    return NextResponse.json({ error: "lead_id e etapa sao obrigatorios" }, { status: 400 });
  }

  const resultado = interpretarMudancaEtapa(body);
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.erro }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc(
    "atualizar_etapa_lead_v1",
    paramsRpcEtapa(leadId, null, resultado.pedido, "sistema", null),
  );

  if (error) {
    const falha = traduzirErroEtapa(error.message);
    return NextResponse.json({ error: falha.mensagem }, { status: falha.status });
  }

  const lead = data as { id: string; nome: string; cliente_id: string; etapa: string };
  return NextResponse.json({ lead: { id: lead.id, nome: lead.nome, cliente_id: lead.cliente_id, etapa: lead.etapa } });
}
```

- [ ] **Step 4: Reescrever `app/api/clientes/[clienteId]/crm/leads/[leadId]/route.ts`**

```ts
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/app/lib/authSession";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { interpretarMudancaEtapa, paramsRpcEtapa, traduzirErroEtapa } from "@/app/lib/leadEtapas";

const N8N_WEBHOOK_URL = "https://n8n.hildeberto.digital/webhook/crm-lead-etapa1";
const CAMPOS_RETORNO = "id,cliente_id,etapa,pausado_ia,valor_conversao,moeda,data_conversao,motivo_perda,atualizado_em";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ clienteId: string; leadId: string }> }) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { clienteId, leadId } = await params;
  const { data: cliente } = await supabaseAdmin
    .from("clientes")
    .select("id,nome,status_pagamento")
    .eq("id", clienteId)
    .maybeSingle();
  if (!cliente || cliente.status_pagamento === "cancelado") {
    return NextResponse.json({ error: "cliente não encontrado" }, { status: 404 });
  }

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id,cliente_id,telefone,origem,etapa")
    .eq("id", leadId)
    .eq("cliente_id", clienteId)
    .maybeSingle();
  if (!lead) return NextResponse.json({ error: "lead não encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);

  if (typeof body?.pausado_ia === "boolean") {
    const { data, error } = await supabaseAdmin
      .from("leads")
      .update({ pausado_ia: body.pausado_ia, atualizado_em: new Date().toISOString() })
      .eq("id", leadId)
      .eq("cliente_id", clienteId)
      .select(CAMPOS_RETORNO)
      .single();
    if (error) return NextResponse.json({ error: "falha ao atualizar lead" }, { status: 500 });
    return NextResponse.json({ lead: data });
  }

  const resultado = interpretarMudancaEtapa(body);
  if (!resultado.ok) return NextResponse.json({ error: resultado.erro }, { status: 400 });

  const { data, error } = await supabaseAdmin.rpc(
    "atualizar_etapa_lead_v1",
    paramsRpcEtapa(leadId, clienteId, resultado.pedido, "axven", null),
  );
  if (error) {
    const falha = traduzirErroEtapa(error.message);
    return NextResponse.json({ error: falha.mensagem }, { status: falha.status });
  }

  const atualizado = data as { etapa: string };
  if (atualizado.etapa !== lead.etapa) {
    await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        lead_id: lead.id,
        cliente_id: lead.cliente_id,
        cliente_nome: cliente.nome,
        etapa_anterior: lead.etapa,
        etapa_nova: atualizado.etapa,
        telefone: lead.telefone,
        origem: lead.origem,
      }),
    }).catch(() => console.error("Falha ao notificar mudança de etapa."));
  }

  return NextResponse.json({ lead: data });
}
```

- [ ] **Step 5: Reescrever `app/api/crm/leads/[id]/fechar/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { ETAPA_VENDA, interpretarMudancaEtapa, paramsRpcEtapa, traduzirErroEtapa } from "@/app/lib/leadEtapas";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await params;

  const authHeader = req.headers.get("authorization") ?? "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!accessToken) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "sessão inválida" }, { status: 401 });
  }

  const { data: crmUsuario } = await supabaseAdmin
    .from("crm_usuarios")
    .select("cliente_id")
    .eq("user_id", userData.user.id)
    .single();

  if (!crmUsuario) {
    return NextResponse.json({ error: "usuário sem cliente vinculado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const resultado = interpretarMudancaEtapa({ ...(body && typeof body === "object" ? body : {}), etapa: ETAPA_VENDA });
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.erro }, { status: 400 });
  }

  // A RPC só encontra o lead se ele for do cliente do usuário logado (p_cliente_id).
  const { data, error } = await supabaseAdmin.rpc(
    "atualizar_etapa_lead_v1",
    paramsRpcEtapa(leadId, crmUsuario.cliente_id, resultado.pedido, "portal", userData.user.id),
  );

  if (error) {
    const falha = traduzirErroEtapa(error.message);
    return NextResponse.json({ error: falha.mensagem }, { status: falha.status });
  }

  // Este endpoint registra o fechamento no CRM. Não envia CAPI aqui (entrega 3 da spec).
  const lead = data as Record<string, unknown>;
  return NextResponse.json({
    lead: {
      id: lead.id,
      cliente_id: lead.cliente_id,
      etapa: lead.etapa,
      valor_conversao: lead.valor_conversao,
      moeda: lead.moeda,
      data_conversao: lead.data_conversao,
      atualizado_em: lead.atualizado_em,
    },
  });
}
```

- [ ] **Step 6: Atualizar a lista de etapas do disparo** em `app/api/crm/disparos/route.ts:4`

Trocar:
```ts
const ETAPAS_VALIDAS = ["lead", "qualificado", "agendado", "proposta_enviada", "fechado", "desqualificado"];
```
por:
```ts
const ETAPAS_VALIDAS = ["lead", "qualificado", "oportunidade", "fechado", "perdido"];
```

- [ ] **Step 7: Rodar os testes e o type-check**

Run: `npm run test:painel-axven-base && npm run test:lead-etapas && npx tsc --noEmit`
Esperado: todos os testes `pass`, e `tsc` sem erros.

- [ ] **Step 8: Commit**

```bash
git add app/api/webhooks/leads/etapa/route.ts "app/api/clientes/[clienteId]/crm/leads/[leadId]/route.ts" "app/api/crm/leads/[id]/fechar/route.ts" app/api/crm/disparos/route.ts tests/painel-axven-base-contratos.test.mjs package.json
git commit -m "feat(api): mudanças de etapa passam pela RPC com origem, autor e histórico

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Kanban usa as etapas do cliente e pede o motivo da perda

**Files:**
- Modify: `app/crm/[slug]/KanbanBoard.tsx`
- Modify: `app/crm/[slug]/page.tsx`
- Modify: `app/clientes/[id]/crm/page.tsx`
- Modify: `app/crm/[slug]/disparo/DisparoView.tsx:6` e `:46-55`
- Modify: `tests/painel-axven-base-contratos.test.mjs` (novo teste)

**Interfaces:**
- Consumes: `ordenarEtapas`, `MOTIVOS_PERDA`, `ETAPA_VENDA`, `ETAPA_PERDIDO`, `traduzirErroEtapa` e os tipos `EtapaCliente`, `MotivoPerda` e `TipoEtapa` (Task 1); a tabela `cliente_etapas` e a coluna `leads.motivo_perda` (Task 2); o `PATCH` interno (Task 3).
- Produces: `KanbanBoard` passa a exigir a prop `etapas: EtapaCliente[]`. `LeadRow.etapa` passa a ser `string` e ganha `motivo_perda?: string | null`.

- [ ] **Step 1: Escrever o teste de contrato que falha.** Acrescentar ao fim de `tests/painel-axven-base-contratos.test.mjs`:

```js
test("Kanban desenha as colunas a partir das etapas do cliente e pede motivo da perda", () => {
  const kanban = ler("app/crm/[slug]/KanbanBoard.tsx");
  assert.match(kanban, /etapas: EtapaCliente\[\]/);
  assert.match(kanban, /ordenarEtapas\(/);
  assert.match(kanban, /Motivo da perda/);
  assert.doesNotMatch(kanban, /"proposta_enviada"|"desqualificado"|"nao_fechou"/);
  for (const pagina of ["app/crm/[slug]/page.tsx", "app/clientes/[id]/crm/page.tsx"]) {
    const src = ler(pagina);
    assert.match(src, /from\("cliente_etapas"\)/, `${pagina}: não carrega as etapas`);
    assert.match(src, /motivo_perda/, `${pagina}: não carrega o motivo da perda`);
    assert.match(src, /etapas=\{/, `${pagina}: não passa as etapas ao Kanban`);
  }
  assert.doesNotMatch(ler("app/crm/[slug]/disparo/DisparoView.tsx"), /"proposta_enviada"|"desqualificado"/);
});
```

Run: `npm run test:painel-axven-base`
Esperado: FAIL no teste novo.

- [ ] **Step 2: Imports, tipos e colunas em `KanbanBoard.tsx`**

Depois de `import { supabase } from "@/app/lib/supabase";`, acrescentar:

```ts
import {
  ETAPA_PERDIDO,
  ETAPA_VENDA,
  MOTIVOS_PERDA,
  ordenarEtapas,
  traduzirErroEtapa,
  type EtapaCliente,
  type MotivoPerda,
  type TipoEtapa,
} from "@/app/lib/leadEtapas";
```

Trocar a linha `export type Etapa = "lead" | "qualificado" | ...;` por:

```ts
export type Etapa = string;
```

Em `LeadRow`, depois de `data_conversao?: string | null;`, acrescentar:

```ts
  motivo_perda?: string | null;
```

Trocar `type Column = { key: Etapa; label: string; accent: string };`, o array `const COLUMNS: Column[] = [...]` inteiro e o objeto `const badgeClasses: Record<Etapa, string> = {...}` inteiro por:

```ts
type Column = { key: string; label: string; tipo: TipoEtapa };

const ACCENT_POR_TIPO: Record<TipoEtapa, string> = {
  novo: "border-white/10 bg-zinc-950/80",
  qualificacao: "border-amber-500/20 bg-amber-500/5",
  oportunidade: "border-violet-500/20 bg-violet-500/5",
  venda: "border-emerald-500/20 bg-emerald-500/5",
  perdido: "border-rose-500/20 bg-rose-500/5",
};

const BADGE_POR_TIPO: Record<TipoEtapa, string> = {
  novo: "border-white/10 bg-white/5 text-zinc-300",
  qualificacao: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  oportunidade: "border-violet-500/30 bg-violet-500/10 text-violet-200",
  venda: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  perdido: "border-rose-500/30 bg-rose-500/10 text-rose-200",
};

function montarColunas(etapas: EtapaCliente[]): Column[] {
  return ordenarEtapas(etapas).map((etapa) => ({ key: etapa.chave, label: etapa.nome, tipo: etapa.tipo }));
}
```

- [ ] **Step 3: Card e coluna em `KanbanBoard.tsx`**

No `LeadCard`, trocar `{lead.etapa === "fechado" && Number(lead.valor_conversao ?? 0) > 0 ? (` por `{lead.etapa === ETAPA_VENDA && Number(lead.valor_conversao ?? 0) > 0 ? (`. Logo depois do bloco `) : null}` da venda registrada, acrescentar:

```tsx
      {lead.etapa === ETAPA_PERDIDO && lead.motivo_perda ? (
        <span className="mt-3 inline-flex rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] text-rose-200">
          {MOTIVOS_PERDA.find((motivo) => motivo.chave === lead.motivo_perda)?.rotulo ?? lead.motivo_perda}
        </span>
      ) : null}
```

No `KanbanColumn`, trocar `${badgeClasses[column.key]}` por `${BADGE_POR_TIPO[column.tipo]}`, e `` `rounded-3xl ${column.accent}` `` por `` `rounded-3xl ${ACCENT_POR_TIPO[column.tipo]}` ``.

- [ ] **Step 4: Props, estado e arrastar em `KanbanBoard.tsx`**

Em `KanbanBoardProps`, acrescentar `etapas: EtapaCliente[];`. Trocar a assinatura por:

```tsx
export function KanbanBoard({ clienteNome, initialLeads, etapas, accessMode = "portal", clienteId }: KanbanBoardProps) {
  const columns = montarColunas(etapas);
```

Depois de `const [closureError, setClosureError] = useState<string | null>(null);`, acrescentar:

```tsx
  const [pendingLoss, setPendingLoss] = useState<PendingClosure | null>(null);
  const [lossReason, setLossReason] = useState<MotivoPerda | "">("");
  const [lossDetail, setLossDetail] = useState("");
  const [lossError, setLossError] = useState<string | null>(null);
  const [savingLoss, setSavingLoss] = useState(false);
```

Em `handleDragEnd`:
- trocar `COLUMNS.find((col) => col.key === over.id)?.key` por `columns.find((col) => col.key === over.id)?.key`;
- trocar `if (targetColumn === "fechado") {` por `if (targetColumn === ETAPA_VENDA) {`;
- logo depois do bloco da venda (que termina em `return;\n    }`), acrescentar:

```tsx
    if (targetColumn === ETAPA_PERDIDO) {
      setPendingLoss({ lead: draggedLead, etapaAnterior: draggedLead.etapa });
      setLossReason("");
      setLossDetail("");
      setLossError(null);
      return;
    }
```

- na atualização otimista, trocar `{ ...item, etapa: targetColumn, atualizado_em: updatedAt }` por `{ ...item, etapa: targetColumn, motivo_perda: null, atualizado_em: updatedAt }`.

Em `confirmClosure`, trocar os dois `"fechado"` literais (`etapa: "fechado"` no body interno e `etapa: "fechado",` no `setLeads`) e a chamada `notifyStageChange(pendingClosure.lead, pendingClosure.etapaAnterior, "fechado")` por `ETAPA_VENDA`.

No JSX de renderização, trocar `{COLUMNS.map((column) => (` por `{columns.map((column) => (`.

- [ ] **Step 5: Confirmar a perda em `KanbanBoard.tsx`**

Logo depois da função `confirmClosure` (antes de `async function handleTogglePausa`), acrescentar:

```tsx
  async function confirmLoss() {
    if (!pendingLoss || savingLoss) return;
    if (!lossReason) {
      setLossError("Escolha o motivo da perda.");
      return;
    }

    setSavingLoss(true);
    setLossError(null);
    const detalhe = lossDetail.trim() || null;
    const atualizadoEm = new Date().toISOString();

    const error = accessMode === "internal"
      ? await updateInternalLead(pendingLoss.lead.id, { etapa: ETAPA_PERDIDO, motivo: lossReason, motivo_detalhe: detalhe })
      : (await supabase
          .from("leads")
          .update({ etapa: ETAPA_PERDIDO, motivo_perda: lossReason, motivo_perda_detalhe: detalhe, atualizado_em: atualizadoEm })
          .eq("id", pendingLoss.lead.id)).error;

    setSavingLoss(false);

    if (error) {
      setLossError(accessMode === "internal" ? error.message : traduzirErroEtapa(error.message).mensagem);
      return;
    }

    setLeads((prev) =>
      prev.map((item) =>
        item.id === pendingLoss.lead.id
          ? { ...item, etapa: ETAPA_PERDIDO, motivo_perda: lossReason, atualizado_em: atualizadoEm }
          : item,
      ),
    );

    if (accessMode === "portal") {
      notifyStageChange(pendingLoss.lead, pendingLoss.etapaAnterior, ETAPA_PERDIDO);
    }
    setPendingLoss(null);
  }
```

No JSX, logo depois do bloco `{pendingClosure ? ( ... ) : null}`, acrescentar:

```tsx
      {pendingLoss ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onPointerDown={(event) => event.stopPropagation()}>
          <div className="w-full max-w-md rounded-3xl border border-rose-500/20 bg-zinc-950 p-6 shadow-2xl shadow-black/60">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-300">Registrar perda</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{pendingLoss.lead.nome}</h3>
            <p className="mt-2 text-sm text-zinc-400">Saber por que o lead não fechou mostra onde melhorar.</p>

            <div className="mt-5 space-y-4">
              <label className="block text-sm text-zinc-300">
                <span className="mb-2 block">Motivo da perda</span>
                <select
                  value={lossReason}
                  onChange={(event) => setLossReason(event.target.value as MotivoPerda | "")}
                  className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-rose-500/40"
                >
                  <option value="">Escolha um motivo</option>
                  {MOTIVOS_PERDA.map((motivo) => (
                    <option key={motivo.chave} value={motivo.chave}>{motivo.rotulo}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-zinc-300">
                <span className="mb-2 block">Detalhe (opcional)</span>
                <textarea
                  value={lossDetail}
                  onChange={(event) => setLossDetail(event.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Ex.: achou caro, vai pensar"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-rose-500/40"
                />
              </label>
            </div>

            {lossError ? <p className="mt-4 text-sm text-rose-300">{lossError}</p> : null}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={savingLoss}
                onClick={() => {
                  setPendingLoss(null);
                  setLossError(null);
                }}
                className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-zinc-300 hover:bg-white/5 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingLoss}
                onClick={confirmLoss}
                className="flex-1 rounded-2xl bg-rose-500 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-rose-400 disabled:opacity-50"
              >
                {savingLoss ? "Salvando..." : "Confirmar perda"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
```

- [ ] **Step 6: Portal carrega as etapas** (`app/crm/[slug]/page.tsx`)

Acrescentar o import `import type { EtapaCliente } from "@/app/lib/leadEtapas";`. No `select` de `fetchAllLeads`, trocar `"id, nome, telefone, etapa, cliente_id, origem, criado_em, atualizado_em, pausado_ia, valor_conversao, moeda, data_conversao"` por `"id, nome, telefone, etapa, cliente_id, origem, criado_em, atualizado_em, pausado_ia, valor_conversao, moeda, data_conversao, motivo_perda"`.

Trocar `const leads = await fetchAllLeads((cliente as ClienteRow).id);` por:

```ts
  const [leads, { data: etapas, error: etapasError }] = await Promise.all([
    fetchAllLeads((cliente as ClienteRow).id),
    supabaseAdmin
      .from("cliente_etapas")
      .select("chave, nome, tipo, ordem")
      .eq("cliente_id", (cliente as ClienteRow).id)
      .eq("ativo", true),
  ]);
  if (etapasError) throw etapasError;
```

Trocar `<KanbanBoard clienteNome={(cliente as ClienteRow).nome} initialLeads={leads} />` por:

```tsx
      <KanbanBoard clienteNome={(cliente as ClienteRow).nome} initialLeads={leads} etapas={(etapas ?? []) as EtapaCliente[]} />
```

- [ ] **Step 7: Página interna carrega as etapas** (`app/clientes/[id]/crm/page.tsx`)

Acrescentar o import `import type { EtapaCliente } from "@/app/lib/leadEtapas";`. No `select` de `fetchAllLeads`, trocar `"id,nome,telefone,etapa,cliente_id,origem,criado_em,atualizado_em,pausado_ia,valor_conversao,moeda,data_conversao"` por `"id,nome,telefone,etapa,cliente_id,origem,criado_em,atualizado_em,pausado_ia,valor_conversao,moeda,data_conversao,motivo_perda"`.

Trocar `const leads = await fetchAllLeads(cliente.id);` por:

```ts
  const [leads, { data: etapasData, error: etapasError }] = await Promise.all([
    fetchAllLeads(cliente.id),
    supabaseAdmin.from("cliente_etapas").select("chave,nome,tipo,ordem").eq("cliente_id", cliente.id).eq("ativo", true),
  ]);
  if (etapasError) throw etapasError;
  const etapas = (etapasData ?? []) as EtapaCliente[];
  const chavesOportunidade = new Set(etapas.filter((etapa) => etapa.tipo === "oportunidade").map((etapa) => etapa.chave));
  const nomeOportunidade = etapas.find((etapa) => etapa.chave === "oportunidade")?.nome ?? "Oportunidades";
```

Trocar a linha da métrica `{ label: "Agendados", value: leads.filter((lead) => lead.etapa === "agendado").length, hint: "Com agenda confirmada" },` por:

```ts
    { label: nomeOportunidade, value: leads.filter((lead) => chavesOportunidade.has(lead.etapa)).length, hint: "Perto de fechar" },
```

Trocar `<KanbanBoard clienteNome={cliente.nome} clienteId={cliente.id} accessMode="internal" initialLeads={leads} />` por:

```tsx
          <KanbanBoard clienteNome={cliente.nome} clienteId={cliente.id} accessMode="internal" initialLeads={leads} etapas={etapas} />
```

- [ ] **Step 8: Lista de etapas do disparo** (`app/crm/[slug]/disparo/DisparoView.tsx`)

Trocar a linha 6 por:

```ts
export type Etapa = "lead" | "qualificado" | "oportunidade" | "fechado" | "perdido";
```

Trocar as linhas 46 a 55 (`const ETAPAS ...` até `const ETAPAS_PADRAO ...`) por:

```ts
const ETAPAS: { key: Etapa; label: string }[] = [
  { key: "lead", label: "Novo" },
  { key: "qualificado", label: "Qualificado" },
  { key: "oportunidade", label: "Oportunidade" },
  { key: "fechado", label: "Venda" },
  { key: "perdido", label: "Perdido" },
];

const ETAPAS_PADRAO: Etapa[] = ["lead", "qualificado", "oportunidade"];
```

- [ ] **Step 9: Testes, type-check e build**

Run: `npm run test:painel-axven-base && npx tsc --noEmit && npm run build`
Esperado: testes `pass`, `tsc` sem erros e o build termina com `✓ Compiled successfully`.

- [ ] **Step 10: Commit**

```bash
git add "app/crm/[slug]/KanbanBoard.tsx" "app/crm/[slug]/page.tsx" "app/clientes/[id]/crm/page.tsx" "app/crm/[slug]/disparo/DisparoView.tsx" tests/painel-axven-base-contratos.test.mjs
git commit -m "feat(crm): Kanban monta colunas pelas etapas do cliente e registra motivo da perda

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Dashboard Executiva reconhece a etapa Oportunidade

**Files:**
- Modify: `app/dashboard/executiva/dashboardData.ts:1`
- Modify: `tests/dashboard-executiva.test.mjs` (novo teste no fim)

**Interfaces:**
- Consumes: nada novo.
- Produces: `QUALIFIED_STAGES` passa a incluir `oportunidade` e `perdido` fica fora.

- [ ] **Step 1: Escrever o teste que falha.** Acrescentar no fim de `tests/dashboard-executiva.test.mjs`:

```js
test("funil CRM conta a etapa nova oportunidade como qualificada, e perdido não", () => {
  const result = summarizeCrm([
    { cliente_id: "a", etapa: "oportunidade", qualificado: false, valor_conversao: null, moeda: null, campanha: null },
    { cliente_id: "a", etapa: "perdido", qualificado: false, valor_conversao: null, moeda: null, campanha: null },
  ]);
  assert.equal(result.qualified, 1);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run test:dashboard-executiva`
Esperado: FAIL, `1 !== 0` no teste novo.

- [ ] **Step 3: Implementar.** Em `app/dashboard/executiva/dashboardData.ts:1`, trocar:

```ts
export const QUALIFIED_STAGES = new Set(["qualificado", "agendado", "proposta_enviada", "fechado"]);
```
por:
```ts
// "agendado" e "proposta_enviada" continuam aqui porque a captação da própria Axven
// (aquisicao_axven_leads) ainda usa essas etapas; "oportunidade" é a etapa nova dos clientes.
export const QUALIFIED_STAGES = new Set(["qualificado", "oportunidade", "agendado", "proposta_enviada", "fechado"]);
```

- [ ] **Step 4: Rodar tudo**

Run: `npm run test:dashboard-executiva && npm run test:dashboard-executiva-saude && npm run test:lead-etapas && npm run test:painel-axven-base`
Esperado: todos `pass`.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/executiva/dashboardData.ts tests/dashboard-executiva.test.mjs
git commit -m "feat(dashboard): etapa oportunidade conta como qualificada

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Aplicar em produção, publicar e conferir

**Files:**
- Modify: `AXVEN Cofri/01 - Projetos/Painel Axven — especificação (2026-09-29).md` (seção 15)
- Modify: `AXVEN Cofri/01 - Projetos/Axven Plataforma.md` (tabelas e pendências)

**Interfaces:**
- Consumes: tudo das Tasks 1 a 5.
- Produces: a entrega 1 no ar. É a base que a entrega 2 (portal novo) consome.

- [ ] **Step 1: Conferir o fluxo do n8n que recebe as mudanças de etapa**

Com o conector n8n, buscar o workflow cujo webhook é `crm-lead-etapa1` (`search_workflows` e depois `get_workflow_details`). Procurar comparações com `agendado`, `proposta_enviada`, `nao_fechou` ou `desqualificado`. Se existir alguma, anotar o nó e trocar pela chave nova (`oportunidade` ou `perdido`) antes do Step 3. Se não existir, seguir.

- [ ] **Step 2: Ensaio final contra o banco de produção**

Repetir o Step 5 da Task 2 (`begin` + `_antes` + as duas migrações + o teste + `rollback`).
Esperado: `TODOS OS TESTES PASSARAM`.

- [ ] **Step 3: Aplicar as migrações**

`apply_migration` no projeto `ljexwrcevetpysmwjtyq`, primeiro com `name: painel_axven_etapas_base` e o conteúdo de `20260929180000_painel_axven_etapas_base.sql`, depois com `name: painel_axven_migrar_etapas` e o conteúdo de `20260929180100_painel_axven_migrar_etapas.sql`.

- [ ] **Step 4: Conferir o banco**

`execute_sql`:
```sql
select
  (select count(*) from public.leads) as leads,
  (select count(*) from public.leads l where not exists (
     select 1 from public.cliente_etapas e where e.cliente_id = l.cliente_id and e.chave = l.etapa and e.ativo)) as fora_do_funil,
  (select count(*) from public.leads l where not exists (
     select 1 from public.lead_etapa_eventos e where e.lead_id = l.id and e.etapa_anterior is null)) as sem_evento_entrada,
  (select string_agg(etapa || '=' || n, ', ' order by etapa) from (select etapa, count(*) n from public.leads group by etapa) x) as por_etapa,
  (select nome from public.cliente_etapas e join public.clientes c on c.id = e.cliente_id
     where c.nome = 'Camilo Imóveis' and e.chave = 'oportunidade') as oportunidade_camilo;
```
Esperado: `fora_do_funil = 0`, `sem_evento_entrada = 0`, `oportunidade_camilo = Visita`, e em `por_etapa` só aparecem `lead`, `qualificado`, `oportunidade`, `fechado` e `perdido`. O total de `leads` é o mesmo do Step 2.

- [ ] **Step 5: Publicar**

```bash
git checkout master && git pull --ff-only
git merge --no-ff feat/painel-axven-base -m "Merge branch 'feat/painel-axven-base'"
git push origin master
```

Acompanhar o deploy do projeto `axven` na Vercel até ficar `READY`.

- [ ] **Step 6: Conferir no ar**

Primeiro, pegar o id do Camilo e um lead de teste dele (os leads com `plataforma = 'teste'` foram marcados como teste em 25/09):

```sql
select c.id as cliente_id, l.id as lead_id, l.nome, l.etapa
from public.clientes c
join public.leads l on l.cliente_id = c.id
where c.nome = 'Camilo Imóveis' and l.plataforma = 'teste'
limit 1;
```

No Chrome:
1. Abrir `https://www.axvendigital.com.br/clientes/{cliente_id da consulta}/crm` logado como Axven. As colunas devem ser Novo, Qualificado, Visita, Venda e Perdido.
2. Arrastar o lead de teste da consulta para Perdido: o modal pede o motivo. Confirmar com "Outro" e detalhe "teste entrega 1".
3. Conferir o registro:

```sql
select etapa_anterior, etapa_nova, motivo, origem
from public.lead_etapa_eventos
order by criado_em desc
limit 1;
```
Esperado: `etapa_nova = perdido`, `motivo = outro`, `origem = axven`.

4. Arrastar o lead de volta para a etapa que aparecia na consulta (o histórico guarda as duas mudanças).

- [ ] **Step 7: Atualizar o cofre**

- Na especificação (seção 15), marcar "Listar tudo que grava em `leads.etapa`" como feito e registrar "Entrega 1 no ar em DD/MM/AAAA", com a data do deploy do Step 5.
- Em `Axven Plataforma.md`, na seção "Tabelas", acrescentar: `cliente_etapas` (funil de cada cliente) e `lead_etapa_eventos` (histórico de etapas; origem portal, axven, sync ou sistema).

---

## Self-review (feito ao escrever)

- **Cobertura da spec (seção 4.2 e entrega 1):**
  - `cliente_etapas`: Task 2.
  - Colunas em `leads`, `clientes` e `crm_usuarios`: Task 2.
  - `lead_etapa_eventos`: Task 2.
  - Migração das etapas antigas: Task 2 (migração de dados).
  - "Listar e ajustar quem grava em `leads.etapa`": Tasks 3, 4 e 6 (Step 1, n8n).
  - "Pronto quando: os 139 leads estão nas etapas novas e as mudanças geram eventos com autor": Task 2 (T3, T4, T16) e Task 6 (Steps 4 e 6).
- **Fora desta entrega:** sincronização com o WhatsTracker (entrega 4), o portal novo com abas (entrega 2), a tela de configuração de etapas (entrega 4, seção 6) e o lembrete e o envio ao Meta (entrega 3). As colunas que eles usam já nascem aqui.
- **Nomes conferidos entre tarefas:** `atualizar_etapa_lead_v1` e os parâmetros `p_*`; `paramsRpcEtapa`; `interpretarMudancaEtapa`; `traduzirErroEtapa`; `EtapaCliente` com `chave`, `nome`, `tipo` e `ordem`; `ETAPA_VENDA = "fechado"`; `ETAPA_PERDIDO = "perdido"`.
