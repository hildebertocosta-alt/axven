# Painel Axven · Entrega 3 (Hábito + venda no Meta): plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) Todo dia às 8h30, o atendente de cada cliente recebe no WhatsApp quantos leads estão parados há mais de 3 dias, com o link do painel já filtrado. (2) Quando um lead vira Venda com valor, a plataforma manda o evento Purchase com o valor para o Meta (API de Conversões), uma única vez por lead. O primeiro cliente é o Camilo.

**Architecture:**
- Dois módulos puros testados com `node --test`: `app/lib/metaVenda.ts` (monta o evento de venda) e `app/lib/lembreteParados.ts` (texto e data do lembrete).
- O envio ao Meta fica em `app/lib/metaVendaServidor.ts` (server-only). Ele é chamado pelas três rotas que registram venda, depois que o banco confirma a mudança. Nunca lança erro: se o Meta falhar, a venda continua registrada e a falha fica em `capi_eventos`.
- O lembrete é um cron da Vercel (`/api/cron/lembrete-parados`, 08h30 de Brasília). Ele conta os parados, grava a notificação numa tabela com trava de "1 por atendente por dia" e envia direto pela Uazapi da Axven.

**Por que o lembrete não passa pelo n8n:** a fila do n8n (`AXVEN — Aquisição — Outbox WhatsApp`) é presa às tabelas da captação da Axven, e criar um fluxo novo por API arrisca não religar as credenciais. São 1 a 7 mensagens por dia, então o envio direto pela Vercel, com trava diária no banco, é mais simples e cabe inteiro em testes do repositório.

**Tech Stack:** Next.js 16 · Supabase (`ljexwrcevetpysmwjtyq`) · Vercel Cron · Uazapi (`https://axven.uazapi.com/send/text`) · Meta Graph API `v21.0/{pixel}/events` · `node --test`.

**Spec:** `docs/superpowers/specs/2026-09-29-painel-axven-design.md`, seções 7 e 8 e entrega 3 da seção 12.

## Global Constraints

- **Segredos nunca no código, no cofre ou no chat.** O token da Uazapi da Axven vai na variável `UAZAPI_AXVEN_TOKEN` da Vercel. O token de Conversões de cada cliente vai na tabela `cliente_segredos`, que só o servidor lê. Os dois são colocados pelo Hildeberto.
- **Evento de venda:** `event_name = "Purchase"`, `event_id = axven_venda_<lead_id>` (estável), `custom_data.value` e `custom_data.currency` (padrão BRL).
- **Identificação do lead, em ordem de preferência:**
  1. `ctwa_clid`: veio de anúncio de clique para WhatsApp. Usa `action_source = business_messaging`, `messaging_channel = whatsapp` e `page_id`.
  2. `leadgen_id`: veio de formulário do Meta. Usa `action_source = system_generated`, `user_data.lead_id` e `custom_data.event_source = crm`.
  3. Telefone ou e-mail com hash SHA-256: `action_source = system_generated`.
  4. Sem nenhum desses, não envia (motivo `sem_identificador`).
- **Data do evento:** a data da venda, desde que tenha menos de 7 dias. Se for mais antiga, usa o momento do envio, porque o Meta recusa eventos antigos.
- **Só envia se** o cliente tem `capi_origem = 'axven'`, `pixel_id` e token cadastrado, e o lead não é de teste (`plataforma = 'teste'`).
- **Lembrete:** só vai para `crm_usuarios` com `recebe_lembrete = true` e `whatsapp` preenchido, de clientes não cancelados, e só quando há mais de 0 parados. O "parado" segue a mesma regra da entrega 2: etapa diferente de Venda e Perdido e `etapa_alterada_em` com mais de 3 dias. Leads de teste ficam fora.
- **Horário do cron:** `30 11 * * *` em UTC, que é 08h30 de Brasília.
- **Texto do lembrete, exato:**

```
Bom dia, {primeiro nome}! ☀️

Você tem *{n} leads sem atualização* há mais de 3 dias na {cliente}.

Atualize em 2 minutos: {link}
```

  Com n = 1, a frase vira "*1 lead sem atualização*". O link é `https://www.axvendigital.com.br/crm/{slug}?parados=1`.

## Review Focus

1. **Venda marcada duas vezes** (Venda → Qualificado → Venda). O Meta deve receber um único Purchase: o `event_id` é estável e o servidor pula o envio quando `capi_eventos` já tem `enviado` para aquele `event_id`. Coberto pelos testes das Tasks 1 e 4.
2. **Lead de teste nunca vai ao Meta.** Coberto pela Task 4.
3. **Meta fora do ar ou token inválido.** A mudança de etapa não falha e a falha é registrada como `falhou`. Coberto pela Task 4 (contrato: `try/catch`, sem `throw`).
4. **Cron rodando duas vezes no mesmo dia.** Sai uma mensagem só, garantida pela unicidade `(usuario_id, tipo, data_ref)`. Coberto pelo teste SQL da Task 3.
5. **Venda com data antiga** (registrada hoje com data de 20 dias atrás). O `event_time` vira o momento do envio. Coberto pela Task 1.

---

## Preparação

- [ ] Branch a partir da `master` atualizada:

```bash
cd "C:/Users/Junior/Desktop/AXVEN/ORCA/axven"
git checkout master && git pull --ff-only
git checkout -b feat/painel-axven-entrega3
node --test tests/*.test.mjs
```
Esperado: `ℹ fail 0`.

---

### Task 1: Evento de venda para o Meta (`app/lib/metaVenda.ts`)

**Files:** Create `app/lib/metaVenda.ts`, `tests/meta-venda.test.mjs` · Modify `package.json` (script `"test:meta-venda": "node --test tests/meta-venda.test.mjs"`)

**Interfaces (Produces):**
- `type LeadVenda = { id: string; valor: number | null; moeda: string | null; dataConversao: string | null; leadgenId: string | null; ctwaclid: string | null; pageId: string | null; telefone: string | null; email: string | null }`
- `eventIdVenda(leadId: string): string`
- `hashSha256(valor: string): string`
- `telefoneParaMeta(telefone: string | null): string | null`, que devolve só dígitos com 55
- `montarEventoVenda(lead: LeadVenda, agora: Date): { ok: true; evento: Record<string, unknown> } | { ok: false; motivo: "sem_valor" | "sem_identificador" }`

- [ ] **Step 1: Teste que falha** (`tests/meta-venda.test.mjs`)

```js
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { eventIdVenda, hashSha256, montarEventoVenda, telefoneParaMeta } from "../app/lib/metaVenda.ts";

const AGORA = new Date("2026-09-30T12:00:00.000Z");
const sha = (v) => createHash("sha256").update(v).digest("hex");
const base = (over = {}) => ({ id: "L1", valor: 1500, moeda: "BRL", dataConversao: "2026-09-29T15:00:00.000Z", leadgenId: null, ctwaclid: null, pageId: null, telefone: null, email: null, ...over });

test("event_id é estável por lead", () => {
  assert.equal(eventIdVenda("abc"), "axven_venda_abc");
});

test("telefone vai com 55 e só dígitos; hash é sha256 do valor normalizado", () => {
  assert.equal(telefoneParaMeta("(81) 99911-1430"), "5581999111430");
  assert.equal(telefoneParaMeta("5581999111430"), "5581999111430");
  assert.equal(telefoneParaMeta("123"), null);
  assert.equal(hashSha256("  Teste@Email.COM "), sha("teste@email.com"));
});

test("venda de clique para WhatsApp usa ctwa_clid e business_messaging", () => {
  const r = montarEventoVenda(base({ ctwaclid: "CLID1", pageId: "P1", leadgenId: "G1" }), AGORA);
  assert.equal(r.ok, true);
  assert.deepEqual(r.evento, {
    event_name: "Purchase",
    event_time: Math.floor(new Date("2026-09-29T15:00:00.000Z").getTime() / 1000),
    event_id: "axven_venda_L1",
    action_source: "business_messaging",
    messaging_channel: "whatsapp",
    user_data: { ctwa_clid: "CLID1", page_id: "P1" },
    custom_data: { currency: "BRL", value: 1500 },
  });
});

test("venda de formulário usa lead_id do Meta e marca como CRM", () => {
  const r = montarEventoVenda(base({ leadgenId: "G1", telefone: "81999111430" }), AGORA);
  assert.deepEqual(r.evento, {
    event_name: "Purchase",
    event_time: Math.floor(new Date("2026-09-29T15:00:00.000Z").getTime() / 1000),
    event_id: "axven_venda_L1",
    action_source: "system_generated",
    user_data: { lead_id: "G1", ph: [sha("5581999111430")] },
    custom_data: { currency: "BRL", value: 1500, event_source: "crm", lead_event_source: "Axven CRM" },
  });
});

test("sem ctwa nem lead_id, usa telefone e e-mail com hash", () => {
  const r = montarEventoVenda(base({ telefone: "5581999111430", email: "A@B.com" }), AGORA);
  assert.deepEqual(r.evento.user_data, { ph: [sha("5581999111430")], em: [sha("a@b.com")] });
  assert.equal(r.evento.action_source, "system_generated");
});

test("venda sem valor ou sem nenhum identificador não é enviada", () => {
  assert.deepEqual(montarEventoVenda(base({ valor: 0, telefone: "5581999111430" }), AGORA), { ok: false, motivo: "sem_valor" });
  assert.deepEqual(montarEventoVenda(base(), AGORA), { ok: false, motivo: "sem_identificador" });
});

test("venda com data de mais de 7 dias usa o momento do envio; data futura também", () => {
  const antiga = montarEventoVenda(base({ telefone: "5581999111430", dataConversao: "2026-09-10T12:00:00.000Z" }), AGORA);
  assert.equal(antiga.evento.event_time, Math.floor(AGORA.getTime() / 1000));
  const futura = montarEventoVenda(base({ telefone: "5581999111430", dataConversao: "2026-10-05T12:00:00.000Z" }), AGORA);
  assert.equal(futura.evento.event_time, Math.floor(AGORA.getTime() / 1000));
  const semData = montarEventoVenda(base({ telefone: "5581999111430", dataConversao: null, moeda: null }), AGORA);
  assert.equal(semData.evento.event_time, Math.floor(AGORA.getTime() / 1000));
  assert.equal(semData.evento.custom_data.currency, "BRL");
});
```

- [ ] **Step 2:** `npm run test:meta-venda`. Esperado: FAIL `Cannot find module …metaVenda.ts`.

- [ ] **Step 3: Implementar `app/lib/metaVenda.ts`**

```ts
// Evento de venda (Purchase) para a API de Conversões do Meta (Painel Axven · Entrega 3).
// Sem imports com alias, para ser testado direto com `node --test`.
import { createHash } from "node:crypto";

export type LeadVenda = {
  id: string;
  valor: number | null;
  moeda: string | null;
  dataConversao: string | null;
  leadgenId: string | null;
  ctwaclid: string | null;
  pageId: string | null;
  telefone: string | null;
  email: string | null;
};

const SETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

export function eventIdVenda(leadId: string): string {
  return `axven_venda_${leadId}`;
}

export function hashSha256(valor: string): string {
  return createHash("sha256").update(valor.trim().toLowerCase()).digest("hex");
}

export function telefoneParaMeta(telefone: string | null): string | null {
  const digitos = (telefone ?? "").replace(/\D/g, "");
  if (digitos.length < 10) return null;
  return digitos.length <= 11 ? `55${digitos}` : digitos;
}

function momentoDoEvento(dataConversao: string | null, agora: Date): number {
  const data = dataConversao ? new Date(dataConversao).getTime() : Number.NaN;
  const valida = !Number.isNaN(data) && data <= agora.getTime() && agora.getTime() - data <= SETE_DIAS_MS;
  return Math.floor((valida ? data : agora.getTime()) / 1000);
}

export function montarEventoVenda(
  lead: LeadVenda,
  agora: Date,
): { ok: true; evento: Record<string, unknown> } | { ok: false; motivo: "sem_valor" | "sem_identificador" } {
  const valor = Number(lead.valor ?? 0);
  if (!Number.isFinite(valor) || valor <= 0) return { ok: false, motivo: "sem_valor" };

  const comum = {
    event_name: "Purchase",
    event_time: momentoDoEvento(lead.dataConversao, agora),
    event_id: eventIdVenda(lead.id),
  };
  const valorEvento = { currency: lead.moeda || "BRL", value: Math.round(valor * 100) / 100 };

  if (lead.ctwaclid) {
    return {
      ok: true,
      evento: {
        ...comum,
        action_source: "business_messaging",
        messaging_channel: "whatsapp",
        user_data: { ctwa_clid: lead.ctwaclid, ...(lead.pageId ? { page_id: lead.pageId } : {}) },
        custom_data: valorEvento,
      },
    };
  }

  const telefone = telefoneParaMeta(lead.telefone);
  const email = lead.email?.trim() ? lead.email : null;
  const contato = {
    ...(telefone ? { ph: [hashSha256(telefone)] } : {}),
    ...(email ? { em: [hashSha256(email)] } : {}),
  };

  if (lead.leadgenId) {
    return {
      ok: true,
      evento: {
        ...comum,
        action_source: "system_generated",
        user_data: { lead_id: lead.leadgenId, ...contato },
        custom_data: { ...valorEvento, event_source: "crm", lead_event_source: "Axven CRM" },
      },
    };
  }

  if (Object.keys(contato).length === 0) return { ok: false, motivo: "sem_identificador" };
  return { ok: true, evento: { ...comum, action_source: "system_generated", user_data: contato, custom_data: valorEvento } };
}
```

- [ ] **Step 4:** `npm run test:meta-venda`. Esperado: 7 `pass`.
- [ ] **Step 5:** Commit `feat(meta): evento de venda (Purchase) para a API de Conversões`.

---

### Task 2: Texto e data do lembrete (`app/lib/lembreteParados.ts`)

**Files:** Create `app/lib/lembreteParados.ts`, `tests/lembrete-parados.test.mjs` · Modify `package.json` (`"test:lembrete-parados": "node --test tests/lembrete-parados.test.mjs"`)

**Interfaces (Produces):** `textoLembrete({ nomeAtendente, nomeCliente, parados, link }): string` · `dataLembrete(agora: Date): string` (AAAA-MM-DD em Brasília) · `limiteParado(agora: Date): string` (ISO de 3 dias atrás) · `linkParados(slug: string): string`

- [ ] **Step 1: Teste que falha**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { dataLembrete, limiteParado, linkParados, textoLembrete } from "../app/lib/lembreteParados.ts";

test("texto do lembrete com plural e singular", () => {
  const link = linkParados("camilo-imoveis");
  assert.equal(link, "https://www.axvendigital.com.br/crm/camilo-imoveis?parados=1");
  assert.equal(
    textoLembrete({ nomeAtendente: "Joelson Silva", nomeCliente: "Camilo Imóveis", parados: 14, link }),
    `Bom dia, Joelson! ☀️\n\nVocê tem *14 leads sem atualização* há mais de 3 dias na Camilo Imóveis.\n\nAtualize em 2 minutos: ${link}`,
  );
  assert.match(textoLembrete({ nomeAtendente: null, nomeCliente: "X", parados: 1, link }), /^Bom dia! ☀️[\s\S]*\*1 lead sem atualização\*/);
});

test("data do lembrete é o dia de Brasília", () => {
  assert.equal(dataLembrete(new Date("2026-09-30T02:30:00Z")), "2026-09-29");
  assert.equal(dataLembrete(new Date("2026-09-30T11:30:00Z")), "2026-09-30");
});

test("limite de parado é 3 dias antes", () => {
  assert.equal(limiteParado(new Date("2026-09-30T11:30:00.000Z")), "2026-09-27T11:30:00.000Z");
});
```

- [ ] **Step 2:** rodar e ver falhar (`Cannot find module`).
- [ ] **Step 3: Implementar**

```ts
// Lembrete diário dos leads parados (Painel Axven · Entrega 3). Sem imports com alias.
const DIA_MS = 24 * 60 * 60 * 1000;
const PORTAL = "https://www.axvendigital.com.br";

export function linkParados(slug: string): string {
  return `${PORTAL}/crm/${slug}?parados=1`;
}

export function textoLembrete({ nomeAtendente, nomeCliente, parados, link }: { nomeAtendente: string | null; nomeCliente: string; parados: number; link: string }): string {
  const primeiro = (nomeAtendente ?? "").trim().split(/\s+/)[0];
  const saudacao = primeiro ? `Bom dia, ${primeiro}! ☀️` : "Bom dia! ☀️";
  const quantidade = parados === 1 ? "1 lead sem atualização" : `${parados} leads sem atualização`;
  return `${saudacao}\n\nVocê tem *${quantidade}* há mais de 3 dias na ${nomeCliente}.\n\nAtualize em 2 minutos: ${link}`;
}

export function dataLembrete(agora: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}

export function limiteParado(agora: Date): string {
  return new Date(agora.getTime() - 3 * DIA_MS).toISOString();
}
```

- [ ] **Step 4:** Esperado: 3 `pass`. **Step 5:** Commit `feat(lembrete): texto, data e limite do lembrete de parados`.

---

### Task 3: Banco (segredos, notificações, Camilo no envio da Axven)

**Files:** Create `supabase/migrations/20260930120000_painel_axven_entrega3.sql`, `supabase/tests/painel_axven_entrega3.test.sql`

- [ ] **Step 1: Teste SQL** (rodar dentro de `begin; … rollback;`)

```sql
do $$
declare v_cliente uuid; v_user uuid := '00000000-0000-4000-8000-00000000b001'; v_ok boolean;
begin
  select id into v_cliente from public.clientes where slug = 'camilo-imoveis';
  if (select capi_origem from public.clientes where id = v_cliente) <> 'axven' then raise exception 'E1 FALHOU: Camilo não está com capi_origem axven'; end if;

  insert into auth.users (id, email, aud, role) values (v_user, 'teste-e3@axven.invalid', 'authenticated', 'authenticated');
  insert into public.crm_usuarios (user_id, cliente_id, nome, whatsapp, recebe_lembrete) values (v_user, v_cliente, 'Teste', '5581900000000', true);
  insert into public.notificacoes_whatsapp (usuario_id, cliente_id, tipo, data_ref, telefone, mensagem) values (v_user, v_cliente, 'lembrete_parados', '2026-09-30', '5581900000000', 'x');
  v_ok := false;
  begin
    insert into public.notificacoes_whatsapp (usuario_id, cliente_id, tipo, data_ref, telefone, mensagem) values (v_user, v_cliente, 'lembrete_parados', '2026-09-30', '5581900000000', 'y');
  exception when unique_violation then v_ok := true;
  end;
  if not v_ok then raise exception 'E2 FALHOU: dois lembretes no mesmo dia'; end if;
end $$;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000b001","role":"authenticated"}', true);
set local role authenticated;
do $$
declare v_n int; v_ok boolean := false;
begin
  begin
    select count(*) into v_n from public.cliente_segredos;
  exception when insufficient_privilege then v_ok := true;
  end;
  if not v_ok then raise exception 'E3 FALHOU: usuário do portal consegue ler cliente_segredos'; end if;
  v_ok := false;
  begin
    select count(*) into v_n from public.notificacoes_whatsapp;
  exception when insufficient_privilege then v_ok := true;
  end;
  if not v_ok then raise exception 'E4 FALHOU: usuário do portal consegue ler notificacoes_whatsapp'; end if;
end $$;
reset role;
select 'TODOS OS TESTES PASSARAM' as resultado;
```

- [ ] **Step 2:** Rodar só o teste (sem a migração) em `begin; … rollback;`. Esperado: erro `E1 FALHOU` ou `relation … does not exist`.

- [ ] **Step 3: Migração**

```sql
-- Painel Axven · Entrega 3: segredos por cliente (token de Conversões do Meta), fila do lembrete diário
-- e o Camilo passando a enviar vendas ao Meta pela Axven (ele não usa o WhatsTracker).

create table if not exists public.cliente_segredos (
  cliente_id uuid primary key references public.clientes(id) on delete cascade,
  meta_capi_token text,
  atualizado_em timestamptz not null default now()
);
alter table public.cliente_segredos enable row level security;
revoke all on table public.cliente_segredos from public, anon, authenticated;

create table if not exists public.notificacoes_whatsapp (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.crm_usuarios(user_id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  tipo text not null,
  data_ref date not null,
  telefone text not null,
  mensagem text not null,
  status text not null default 'pendente',
  provider_message_id text,
  erro text,
  criado_em timestamptz not null default now(),
  enviado_em timestamptz,
  constraint notificacoes_whatsapp_tipo_check check (tipo in ('lembrete_parados')),
  constraint notificacoes_whatsapp_status_check check (status in ('pendente','enviado','falhou')),
  constraint notificacoes_whatsapp_uma_por_dia unique (usuario_id, tipo, data_ref)
);
alter table public.notificacoes_whatsapp enable row level security;
revoke all on table public.notificacoes_whatsapp from public, anon, authenticated;

update public.clientes set capi_origem = 'axven' where slug = 'camilo-imoveis';
```

- [ ] **Step 4:** Ensaio `begin;` + migração + teste + `rollback;`. Esperado: `TODOS OS TESTES PASSARAM`. Depois conferir que não ficou nada gravado (`to_regclass('public.cliente_segredos')` = null).
- [ ] **Step 5:** Commit (a aplicação em produção acontece na Task 6).

---

### Task 4: Venda vai para o Meta depois de registrada

**Files:** Create `app/lib/metaVendaServidor.ts`, `tests/entrega3-contratos.test.mjs` · Modify `app/api/crm/leads/[id]/fechar/route.ts`, `app/api/clientes/[clienteId]/crm/leads/[leadId]/route.ts`, `app/api/webhooks/leads/etapa/route.ts` · `package.json` (`"test:entrega3": "node --test tests/entrega3-contratos.test.mjs"`)

**Interfaces:** Consumes `montarEventoVenda`, `LeadVenda` (Task 1). Produces `enviarVendaAoMeta(leadId: string): Promise<void>`, que nunca lança erro.

- [ ] **Step 0: Conferir o formato de `capi_eventos`** (a tabela foi criada fora das migrações do repo): listar colunas e constraints. Se nomes ou status aceitos diferirem do que `registrar()` usa, ajustar `registrar()` ao formato real e registrar a decisão no ledger.

- [ ] **Step 1: Contrato que falha** (`tests/entrega3-contratos.test.mjs`)

```js
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
```

- [ ] **Step 2:** `npm run test:entrega3`. Esperado: FAIL (`ENOENT`).

- [ ] **Step 3: Implementar `app/lib/metaVendaServidor.ts`**

```ts
import "server-only";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { eventIdVenda, montarEventoVenda } from "@/app/lib/metaVenda";

const GRAPH = "https://graph.facebook.com/v21.0";

async function registrar(clienteId: string, leadId: string, status: string, payload: unknown, erro: string | null) {
  await supabaseAdmin.from("capi_eventos").upsert(
    {
      cliente_id: clienteId,
      lead_id: leadId,
      event_name: "Purchase",
      event_id: eventIdVenda(leadId),
      status,
      payload,
      erro: erro ? erro.slice(0, 300) : null,
      enviado_em: status === "enviado" ? new Date().toISOString() : null,
    },
    { onConflict: "event_id,status", ignoreDuplicates: true },
  );
}

// Chamado depois que o banco confirmou a venda. Nunca lança erro: a venda já está registrada,
// e o Meta fora do ar não pode desfazer isso. Toda tentativa fica em capi_eventos.
export async function enviarVendaAoMeta(leadId: string): Promise<void> {
  try {
    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("id, cliente_id, etapa, plataforma, valor_conversao, moeda, data_conversao, leadgen_id, ctwaclid, page_id, telefone, email")
      .eq("id", leadId)
      .maybeSingle();
    if (!lead || lead.etapa !== "fechado" || lead.plataforma === "teste") return;

    const { data: cliente } = await supabaseAdmin.from("clientes").select("id, pixel_id, capi_origem").eq("id", lead.cliente_id).maybeSingle();
    if (!cliente || cliente.capi_origem !== "axven" || !cliente.pixel_id) return;

    const { data: jaEnviado } = await supabaseAdmin
      .from("capi_eventos")
      .select("id")
      .eq("event_id", eventIdVenda(lead.id))
      .eq("status", "enviado")
      .maybeSingle();
    if (jaEnviado) return;

    const { data: segredo } = await supabaseAdmin.from("cliente_segredos").select("meta_capi_token").eq("cliente_id", cliente.id).maybeSingle();
    if (!segredo?.meta_capi_token) {
      await registrar(cliente.id, lead.id, "sem_token", null, "Cliente sem token de Conversões cadastrado.");
      return;
    }

    const montado = montarEventoVenda(
      {
        id: lead.id,
        valor: lead.valor_conversao === null ? null : Number(lead.valor_conversao),
        moeda: lead.moeda,
        dataConversao: lead.data_conversao,
        leadgenId: lead.leadgen_id,
        ctwaclid: lead.ctwaclid,
        pageId: lead.page_id,
        telefone: lead.telefone,
        email: lead.email,
      },
      new Date(),
    );
    if (!montado.ok) {
      await registrar(cliente.id, lead.id, "ignorado", null, montado.motivo);
      return;
    }

    const corpo: Record<string, unknown> = { data: [montado.evento], access_token: segredo.meta_capi_token };
    if (process.env.META_CAPI_TEST_EVENT_CODE) corpo.test_event_code = process.env.META_CAPI_TEST_EVENT_CODE;

    const resposta = await fetch(`${GRAPH}/${cliente.pixel_id}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(8000),
    });
    const retorno = await resposta.json().catch(() => null);
    if (resposta.ok) {
      await registrar(cliente.id, lead.id, "enviado", { evento: montado.evento, retorno }, null);
    } else {
      await registrar(cliente.id, lead.id, "falhou", { evento: montado.evento }, retorno?.error?.message ?? `status ${resposta.status}`);
    }
  } catch (erro) {
    console.error("[meta-venda] falha ao enviar venda", leadId, erro instanceof Error ? erro.message : erro);
  }
}
```

- [ ] **Step 4: Ligar nas rotas.** Em cada uma das três rotas, importar `import { enviarVendaAoMeta } from "@/app/lib/metaVendaServidor";` e, logo depois do bloco `if (error) { … return … }` que segue a chamada da RPC, acrescentar:

```ts
  if ((data as { etapa?: string } | null)?.etapa === "fechado") {
    await enviarVendaAoMeta(<leadId da rota>);
  }
```

Nas rotas: em `fechar/route.ts` e `clientes/.../route.ts` a variável é `leadId`; no webhook de etapa também é `leadId`.

- [ ] **Step 5:** `npm run test:entrega3 && node --test tests/*.test.mjs && npx tsc --noEmit`. Esperado: tudo `pass`, `tsc` sem erro.
- [ ] **Step 6:** Commit `feat(meta): venda registrada vai para a API de Conversões (uma vez por lead)`.

---

### Task 5: Cron do lembrete diário

**Files:** Create `app/api/cron/lembrete-parados/route.ts` · Modify `vercel.json`, `app/crm/[slug]/page.tsx`, `app/crm/[slug]/KanbanBoard.tsx`, `tests/entrega3-contratos.test.mjs`

- [ ] **Step 1: Contrato que falha.** Acrescentar a `tests/entrega3-contratos.test.mjs`:

```js
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
```

- [ ] **Step 2:** Rodar e ver falhar.

- [ ] **Step 3: `app/api/cron/lembrete-parados/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { isValidCronAuthorization } from "@/app/lib/cronAuth";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { dataLembrete, limiteParado, linkParados, textoLembrete } from "@/app/lib/lembreteParados";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Usuario = { user_id: string; nome: string | null; whatsapp: string; cliente_id: string };

async function contarParados(clienteId: string, agora: Date) {
  const { data: etapas } = await supabaseAdmin.from("cliente_etapas").select("chave, tipo").eq("cliente_id", clienteId);
  const encerradas = (etapas ?? []).filter((e) => e.tipo === "venda" || e.tipo === "perdido").map((e) => e.chave);
  let consulta = supabaseAdmin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", clienteId)
    .lt("etapa_alterada_em", limiteParado(agora))
    .or("plataforma.is.null,plataforma.neq.teste");
  if (encerradas.length > 0) consulta = consulta.not("etapa", "in", `(${encerradas.join(",")})`);
  const { count, error } = await consulta;
  if (error) throw error;
  return count ?? 0;
}

async function enviarUazapi(numero: string, texto: string) {
  const token = process.env.UAZAPI_AXVEN_TOKEN;
  if (!token) return { ok: false as const, erro: "UAZAPI_AXVEN_TOKEN ausente" };
  const resposta = await fetch("https://axven.uazapi.com/send/text", {
    method: "POST",
    headers: { "Content-Type": "application/json", token },
    body: JSON.stringify({ number: numero, text: texto }),
    signal: AbortSignal.timeout(15000),
  });
  const corpo = await resposta.json().catch(() => null);
  const id = typeof corpo?.messageid === "string" ? corpo.messageid.trim() : "";
  return resposta.ok && id ? { ok: true as const, id } : { ok: false as const, erro: `uazapi status ${resposta.status}` };
}

export async function GET(req: NextRequest) {
  const headers = { "Cache-Control": "no-store" };
  if (!isValidCronAuthorization(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
  }

  const agora = new Date();
  const hoje = dataLembrete(agora);
  const simular = req.nextUrl.searchParams.get("simular") === "1";
  const paraTeste = (req.nextUrl.searchParams.get("para") ?? "").replace(/\D/g, "");

  const { data: usuarios, error } = await supabaseAdmin
    .from("crm_usuarios")
    .select("user_id, nome, whatsapp, cliente_id")
    .eq("recebe_lembrete", true)
    .not("whatsapp", "is", null);
  if (error) return NextResponse.json({ error: "falha_ao_ler_usuarios" }, { status: 500, headers });

  const resultado: { usuario: string; cliente: string; parados: number; status: string }[] = [];

  for (const usuario of (usuarios ?? []) as Usuario[]) {
    try {
      const { data: cliente } = await supabaseAdmin
        .from("clientes")
        .select("id, nome, slug, status_pagamento")
        .eq("id", usuario.cliente_id)
        .maybeSingle();
      if (!cliente || cliente.status_pagamento === "cancelado" || !cliente.slug) continue;

      const parados = await contarParados(cliente.id, agora);
      if (parados === 0) {
        resultado.push({ usuario: usuario.nome ?? usuario.user_id, cliente: cliente.nome, parados, status: "sem_parados" });
        continue;
      }

      const mensagem = textoLembrete({ nomeAtendente: usuario.nome, nomeCliente: cliente.nome, parados, link: linkParados(cliente.slug) });
      if (simular) {
        resultado.push({ usuario: usuario.nome ?? usuario.user_id, cliente: cliente.nome, parados, status: "simulado" });
        continue;
      }

      // Teste manual: manda para outro número e não grava nem trava o dia.
      if (paraTeste) {
        const envio = await enviarUazapi(paraTeste, mensagem);
        resultado.push({ usuario: usuario.nome ?? usuario.user_id, cliente: cliente.nome, parados, status: envio.ok ? "teste_enviado" : `teste_falhou: ${envio.erro}` });
        continue;
      }

      const { data: notificacao, error: erroInsert } = await supabaseAdmin
        .from("notificacoes_whatsapp")
        .insert({ usuario_id: usuario.user_id, cliente_id: cliente.id, tipo: "lembrete_parados", data_ref: hoje, telefone: usuario.whatsapp, mensagem })
        .select("id")
        .single();
      if (erroInsert) {
        resultado.push({ usuario: usuario.nome ?? usuario.user_id, cliente: cliente.nome, parados, status: erroInsert.code === "23505" ? "ja_enviado_hoje" : "falha_ao_registrar" });
        continue;
      }

      const envio = await enviarUazapi(usuario.whatsapp, mensagem);
      await supabaseAdmin
        .from("notificacoes_whatsapp")
        .update(envio.ok ? { status: "enviado", provider_message_id: envio.id, enviado_em: new Date().toISOString() } : { status: "falhou", erro: envio.erro })
        .eq("id", notificacao.id);
      resultado.push({ usuario: usuario.nome ?? usuario.user_id, cliente: cliente.nome, parados, status: envio.ok ? "enviado" : "falhou" });
    } catch (erro) {
      console.error("[lembrete-parados]", usuario.user_id, erro instanceof Error ? erro.message : erro);
      resultado.push({ usuario: usuario.nome ?? usuario.user_id, cliente: usuario.cliente_id, parados: -1, status: "erro" });
    }
  }

  return NextResponse.json({ data: hoje, resultado }, { headers });
}
```

- [ ] **Step 4: `vercel.json`.** Acrescentar ao array `crons`: `{ "path": "/api/cron/lembrete-parados", "schedule": "30 11 * * *" }`.

- [ ] **Step 5: Link abre já filtrado.**
  - Em `app/crm/[slug]/page.tsx`: a página passa a receber `searchParams: Promise<{ parados?: string }>`. Ler `const { parados } = await searchParams;` e passar `soParadosInicial={parados === "1"}` ao `KanbanBoard`.
  - Em `KanbanBoard.tsx`: acrescentar a prop `soParadosInicial?: boolean` e trocar `useState<FiltroLeads>(FILTRO_INICIAL)` por `useState<FiltroLeads>({ ...FILTRO_INICIAL, soParados: Boolean(soParadosInicial) })`.

- [ ] **Step 6:** `npm run test:entrega3 && node --test tests/*.test.mjs && npx tsc --noEmit`. Esperado: tudo `pass`.
- [ ] **Step 7:** Commit `feat(lembrete): cron diário dos leads parados pelo WhatsApp da Axven`.

---

### Task 6: Revisão, publicação e ligar para o Camilo

- [ ] **Step 1:** Revisão final da branch (revisor novo, com o Review Focus acima). Corrigir Critical e Important com teste.
- [ ] **Step 2:** Aplicar a migração da Task 3 (`apply_migration`, name `painel_axven_entrega3`), depois de um ensaio final com o teste SQL.
- [ ] **Step 3:** Merge em `master`, push e deploy `READY`.
- [ ] **Step 4 (Hildeberto): token da Uazapi na Vercel.** No painel da Uazapi, copiar o token da instância **axven**. Na Vercel, no projeto *axven*: *Settings → Environment Variables → Add*, com o nome `UAZAPI_AXVEN_TOKEN`, o valor copiado e o ambiente Production. Depois, *Deployments → Redeploy* no último deploy.
- [ ] **Step 5 (Hildeberto): token de Conversões do Camilo.**
  1. No Gerenciador de Eventos do Meta, abrir o conjunto de dados `1584901086622548` (Camilo) e ir em *Configurações → API de Conversões → Gerar token de acesso*. Copiar o token.
  2. No Supabase, projeto Axven, abrir *Table Editor → `cliente_segredos` → Insert row*. Preencher `cliente_id` com o id do Camilo (`89d834fc-c013-4510-b062-0d5de4b9f0b3`) e `meta_capi_token` com o token copiado. Salvar.
- [ ] **Step 6: Testar a venda no Meta sem sujar os dados.**
  1. No Gerenciador de Eventos, em *Testar eventos*, copiar o código de teste. Criar na Vercel a variável `META_CAPI_TEST_EVENT_CODE` com esse código e fazer o redeploy.
  2. Mover o lead "TESTE AUTH CAMILO N8N" para Venda. Ele é `plataforma = teste`, então **não** deve enviar nada. Conferir que não aparece nada em `capi_eventos`.
  3. Mover um lead real do Camilo que tenha `leadgen_id` para Venda, com valor de R$ 1,00, e conferir:
     - o evento aparece em *Testar eventos* com o valor;
     - `capi_eventos` tem uma linha `enviado`.
  4. Mover esse lead de volta para a etapa anterior e depois para Venda de novo. Conferir que não chega um segundo evento.
  5. Devolver o lead para a etapa original, apagar a variável `META_CAPI_TEST_EVENT_CODE` e fazer o redeploy.
- [ ] **Step 7: Testar o lembrete.**
  1. Ligar o lembrete do Joelson: `update crm_usuarios set recebe_lembrete = true where user_id = (select id from auth.users where email = 'joelsoncarvallho07@gmail.com');`.
  2. Chamar a rota em modo simulação. Esperado: Camilo com cerca de 64 parados, status `simulado`.
  3. Chamar a rota com `?para=<número do Hildeberto>`. O Hildeberto confere no WhatsApp o texto e o link, e que o link abre o painel já filtrado em parados.
  4. A partir daí, o cron das 08h30 envia para o Joelson.

  As chamadas manuais usam `curl` com `Authorization: Bearer $CRON_SECRET`, executado pelo Hildeberto, porque o segredo fica com ele.
- [ ] **Step 8:** Registrar no cofre: na nota do Camilo, o lembrete ligado e a venda indo ao Meta; na especificação, entrega 3 no ar.

---

## Self-review

- **Cobertura da spec:**
  - Seção 7 (Purchase com valor, `event_id` estável, registro das tentativas, transição por `capi_origem`): Tasks 1, 3 e 4.
  - Seção 8 (lembrete diário ao atendente, link filtrado, só quando há parados, tabela própria de notificações): Tasks 2, 3 e 5.
  - "Pronto quando: venda real ligada ao anúncio, com custo por venda e ROAS no portal": depende de a primeira venda real ser registrada pelo Joelson. O portal da entrega 2 já mostra esses números.
- **Desvios da spec, cada um com o motivo:**
  - O lembrete sai pela Vercel com `UAZAPI_AXVEN_TOKEN`, e não pelo fluxo do n8n, porque a fila do n8n é presa à captação e não dá para religar as credenciais por API.
  - O link não faz login automático por link mágico; se o atendente não estiver logado, cai em `/crm/login`. É o que basta hoje.
- **Nomes conferidos:** `montarEventoVenda`, `eventIdVenda`, `enviarVendaAoMeta`, `textoLembrete`, `dataLembrete`, `limiteParado`, `linkParados`, `soParadosInicial`, `notificacoes_whatsapp`, `cliente_segredos`.
