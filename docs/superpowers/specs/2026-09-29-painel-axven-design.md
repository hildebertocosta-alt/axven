---
tipo: especificacao
status: em revisão
atualizado: 2026-09-29
repo: hildebertocosta-alt/axven
tags: [projeto, axven, crm, painel, whatstracker, especificacao]
---

# Painel Axven: especificação (29/09/2026)

Desenho aprovado parte a parte com o Hildeberto em 28 e 29/09/2026. Substitui a parte de "CRM e dashboard" do [[Plano de organização Axven (2026-09-25)]]. Código em [[Axven Plataforma]].

## 1. Objetivo

Um painel único, com a marca Axven, em que **o cliente vê o próprio resultado e move os próprios leads** e **o Hildeberto vê a carteira inteira** e sabe em que etapa cada cliente perde gente. O caminho medido é: anúncio → conversa no WhatsApp → etapas → venda com valor → Meta otimizando por venda.

**Critério de sucesso em 30 dias**, nesta ordem:
1. **Case completo no Camilo:** vendas reais ligadas ao anúncio, com custo por venda e ROAS.
2. **Tela única para o Hildeberto:** a carteira inteira num lugar só, com o gargalo de cada cliente.
3. **Todos os clientes ativos usando:** o comercial de cada um atualizando os leads.

## 2. Decisões tomadas

| # | Decisão | Motivo |
|---|---|---|
| D1 | O painel é usado **pelo Hildeberto e pelo cliente**, e cada cliente vê só os próprios dados | Cliente acompanha o resultado e registra as vendas |
| D2 | **O cliente (atendente) move os leads e registra a venda** | Só quem conversa sabe se fechou. Os 124 leads parados existiam porque o acesso nunca foi entregue |
| D3 | Nesta fase o CRM é **ferramenta de entrega com o menor custo**. Marca própria e app vêm depois | Resultado primeiro |
| D4 | **O WhatsTracker continua capturando os leads do WhatsApp**, e a Axven lê do banco dele | A captura com anúncio já funciona (100% dos leads com campanha, conjunto e anúncio). Não reconstruir |
| D5 | **Não construir caixa de entrada**, e o Chatwoot sai da proposta | O atendente continua no WhatsApp do celular. A conversa aparece no painel só para leitura |
| D6 | O funil tem **3 etapas fixas (Novo, Venda, Perdido)** e **etapas do meio configuráveis por cliente** | Cada nicho tem a sua jornada, mas os clientes continuam comparáveis |
| D7 | Motivos de perda: **preço, parou de responder, sem interesse, comprou em outro lugar, fora do perfil, outro** | Aprovado como está |
| D8 | O lembrete diário vai para o **atendente** | É quem move o lead |
| D9 | KOMMO (OBELE) e Zonic (Face e Corpo) **não serão integrados**. Os suportes confirmaram que não rastreiam | Todos usam o painel Axven |

## 3. Situação atual (medida em 28 e 29/09)

- **WhatsTracker** (banco `whatstraker`, `oulkddcphbcaxhjhxavu`): uma tabela por cliente, todas com as mesmas colunas. Clientes ativos: OBELE 1.238 leads (desde 08/07), JC Motos 339, Parmegiana Garanhuns 312, Face e Corpo 241 e Obele Natal 59. **Todos estão na etapa "L"**, e só 7 têm valor de venda (OBELE). Ex-clientes: Instituto da Indústria (588), Gabriela Brito (114) e Fabio Telles (2).
- **Axven** (banco `Axven`, tabela `leads`): só o Camilo tem leads (99, sendo 89 com anúncio). Etapas: 124 em `lead`, 5 em `qualificado`, 3 em `desqualificado`, 3 em `proposta_enviada`, 2 em `agendado` e 2 em `fechado` (testes). A tabela `leads_mensagens` só tem conversa do Edson (ex-cliente).
- **O portal do cliente já existe:** `/crm/login` (Supabase Auth, com e-mail e senha ou link mágico) → `crm_usuarios` (user_id, cliente_id) → `/crm/[slug]` (Kanban), com o acesso conferido pelo slug no `proxy.ts`. O Kanban já exige valor ao fechar.
- **Hoje convivem 3 CRMs** (`/pipeline`, `/crm/[slug]` e `/clientes/[id]/crm`), **4 visões de painel** (`/dashboard/executiva`, `/dashboard/operacional`, `/relatorios` e `/financeiro`) e 2 páginas de teste no ar.

## 4. Dados

### 4.1 Fontes
| Fonte | Clientes | Como entra |
|---|---|---|
| WhatsTracker | OBELE, JC Motos, Parmegiana Garanhuns, Face e Corpo, Obele Natal | Sincronização (4.3) |
| Fluxo próprio da Axven (formulário Meta + WhatsApp) | Camilo | Como hoje |
| Meta Ads (`meta_ads_insights_daily`) | Todos | Sync diário que já existe |

### 4.2 Mudanças no banco `Axven`
- **`cliente_etapas`** (nova): `id, cliente_id, chave, nome, tipo, ordem, ativo`. O `tipo` é um de `novo | qualificacao | oportunidade | venda | perdido`.
  - As etapas fixas usam as chaves que o código já conhece: `lead` (Novo), `fechado` (Venda) e `perdido` (Perdido).
  - O padrão de todo cliente novo é `lead → qualificado → oportunidade → fechado · perdido`, e o nome da oportunidade segue o nicho (Avaliação, Visita, Orçamento, Pedido). O Hildeberto pode acrescentar etapas do meio.
- **`leads`**: continua usando `etapa` (texto com a chave). Colunas novas: `motivo_perda`, `motivo_perda_detalhe`, `etapa_alterada_em`, `origem_tabela` e `origem_id`, com unicidade em `(cliente_id, origem_tabela, origem_id)`.
- **`lead_etapa_eventos`** (nova), no mesmo modelo de `aquisicao_axven_lead_eventos`: `id, lead_id, cliente_id, etapa_anterior, etapa_nova, valor, motivo, autor_user_id, origem (portal | axven | sync | sistema), criado_em`. **É daqui que saem o tempo em cada etapa e o gargalo.**
- **`clientes`**: colunas novas `whatstracker_tabela` e `capi_origem` (`whatstracker | axven`, padrão `whatstracker`).
- **`crm_usuarios`**: colunas novas `nome`, `whatsapp`, `papel` (`dono | atendente`) e `recebe_lembrete`.
- **Migração das etapas atuais:** `agendado` e `proposta_enviada` → `oportunidade` · `nao_fechou` → `perdido` · `desqualificado` → `perdido` com motivo "fora do perfil". Cada conversão gera um evento com origem `sistema`.
- **Antes de migrar:** listar tudo que grava em `leads.etapa` (rotas `/api/webhooks/leads/*`, fluxos do n8n, Kanban) e ajustar para as chaves novas.

### 4.3 Sincronização com o WhatsTracker
- **Disparo:** um fluxo do n8n (VPS) chama a cada 5 minutos a rota `POST /api/cron/whatstracker-sync`, protegida por segredo. O cron da Vercel só roda 1 vez por dia no plano atual, então não serve para isso.
- **Leitura:** para cada cliente com `whatstracker_tabela`, a rota busca as linhas com `id` maior que o último já importado. A conexão usa uma chave de leitura do projeto `whatstraker`, guardada nas variáveis de ambiente da Vercel e nunca no código.
- **Mapeamento:**
  - `telefone` → `telefone`
  - `first_name` + `last_name` → `nome`
  - `CAMPANHA`, `CONJUNTO` e `ANUNCIO` → `campanha`, `conjunto` e `anuncio`
  - `source_id` → `anuncio_source_id`
  - `ctwaclid`, `page_id` → mesmos nomes
  - `created_at` → `criado_em_origem`
  - `plataforma = 'whatstracker'`, e `origem_tabela` e `origem_id` identificam a linha de origem
  - `"VALOR DE CONVERSÃO"` e `data_compra`, quando preenchidos, levam o lead para `fechado`, com evento de origem `sync`
- **Duplicados:** se já existir lead do mesmo cliente com o mesmo telefone ainda aberto (fora de Venda e Perdido), não cria outro. Registra apenas um evento "voltou a chamar".
- **Primeira execução:** importa todo o histórico dos clientes ativos (cerca de 2.200 leads). Ex-clientes não são importados.
- **Sentido único:** nada é escrito no banco do WhatsTracker.
- **Falhas:** cada execução fica registrada (início, fim, linhas lidas e gravadas, erro), no mesmo modelo de `meta_ads_sync_runs`. Se uma tabela falhar, as outras continuam. Rodar de novo não duplica.

## 5. Portal do cliente (`/crm/[slug]`)

**Aba Leads**
- No desktop, é um Kanban com as etapas do cliente. No celular, é uma lista com botões grandes para cada etapa, sem arrastar.
- Cada card mostra nome, telefone, o anúncio de origem, **há quantos dias está parado** (destaque acima de 3 dias) e o valor, quando for venda.
- Mover para **Venda** pede valor (obrigatório) e data (hoje, por padrão). Mover para **Perdido** pede o motivo da lista D7.
- Filtros: etapa, período, anúncio e "parados há mais de 3 dias".
- **Histórico da conversa** dentro do card, só para leitura. Depende da seção 9.

**Aba Resultado** (período escolhido: mês atual por padrão, 7 dias, 30 dias ou personalizado)
- Investimento, leads, vendas, receita, custo por venda, ROAS e ticket médio.
- Funil com a quantidade por etapa e a % de passagem entre etapas. **O gargalo fica destacado**, por exemplo: "62% dos seus leads param em Qualificado".
- Ranking de anúncios por **vendas e receita**, com leads e custo por venda ao lado. A ligação é pelo ID do anúncio (`anuncio_source_id` com `meta_ads_insights_daily`).

**Saem do portal:** as abas Conversas (a resposta pelo portal) e Disparo.
**O cliente não vê:** os outros clientes, as anotações da Axven nem dados financeiros da Axven.

## 6. Tela Carteira e modo Axven (Hildeberto)

- **Carteira** (nova página inicial interna): uma linha por cliente ativo, inclusive a própria Axven, com:
  - investimento do mês, leads, vendas, receita, custo por venda e ROAS;
  - **% de leads atualizados**, isto é, leads que saíram de Novo ou foram mexidos nos últimos 7 dias;
  - o **gargalo**;
  - sinal verde, amarelo ou vermelho, com os critérios da skill `axven-rotina-clientes`. Reaproveitar `app/dashboard/executiva/clientHealth.ts`.
- **Modo Axven:** ao clicar num cliente, abre o portal dele com o login interno (`axven_session`), mostrando as mesmas telas do cliente e mais as **anotações internas**, o motivo de perda e o histórico da conversa.
- **Configuração do cliente:** etapas do meio (nome, tipo e ordem), `whatstracker_tabela`, `capi_origem` e usuários (nome, e-mail, WhatsApp, papel e recebe lembrete).

## 7. Venda de volta ao Meta (API de Conversões)

- Quando um lead vai para `fechado` com valor e o cliente tem `capi_origem = axven`, a plataforma envia um evento **Purchase** com valor e moeda.
  - Para leads de WhatsApp, o envio usa `ctwa_clid` e `page_id`, com `action_source` de mensagens de negócio.
  - Para leads de formulário, usa os dados do lead e o `leadgen_id`.
  - Em qualquer caso, o telefone vai com hash.
- O `event_id` é estável por lead (`axven_venda_<lead_id>`), para o Meta descartar repetições.
- Cada envio fica registrado (data, resposta do Meta, erro). Voltar um lead de Venda para outra etapa não desfaz o evento no Meta, e isso fica anotado no histórico.
- **Transição:** enquanto `capi_origem = whatstracker`, quem envia é o "Converter" do WhatsTracker. Ao trocar um cliente para `axven`, **o fluxo dele no n8n é desligado no mesmo dia.**
- Referência de código: `lib/metaCapi.ts` do Care OS. O local exato será confirmado no plano.

## 8. Lembrete diário ao atendente

- Todo dia às 8h30, para cada usuário com `recebe_lembrete` e WhatsApp preenchido, é enviada uma mensagem se houver lead parado há mais de 3 dias. Exemplo: "Você tem 14 leads sem atualização há mais de 3 dias. Atualize em 2 minutos: [link]".
- O link abre o portal já filtrado em "parados", com login por link mágico.
- Envio pelo WhatsApp da Axven (Uazapi), reaproveitando o padrão do worker do Outbox (claim, validação, envio, `provider_message_id`) numa **tabela própria de notificações**. A tabela `aquisicao_axven_whatsapp_outbox` fica restrita à captação da Axven.
- Se não houver lead parado, não envia nada.

## 9. Histórico da conversa (condicional)

- **Depende do teste pago em 29/09 na instância da OBELE:** verificar se, ao ativar o histórico no WhatsTracker, as mensagens passam a ser gravadas no banco `whatstraker`.
  - **Se sim:** a sincronização também traz as mensagens para `leads_mensagens`, e a conversa entra na entrega 5.
  - **Se não:** avaliar o botão "Webhook" das conexões do WhatsTracker. Sem fonte, o histórico fica fora desta especificação.
- Nesta fase a conversa é **só para leitura**. A IA que sugere a etapa a partir da conversa fica para depois.

## 10. Limpeza

- **Saem:**
  - as páginas `/meta-batch-teste` e `/meta-relatorios-teste`;
  - as abas Conversas e Disparo de `/crm/[slug]` e as rotas correspondentes, que ficam sem uso;
  - `/clientes/[id]/crm`, substituído pelo modo Axven.
- **Verificar antes de decidir:** `/dashboard/executiva` e `/dashboard/operacional`. O que for útil vai para a Carteira; o resto sai.
- **Não mexer:** `/pipeline` e `/analise` (captação da Axven), `/financeiro`, `/integracoes`, `/criativos`, `/relatorios` e os sistemas listados em [[Não mexer — sistemas homologados]].
- **No WhatsTracker (manual, feito pelo Hildeberto):** desativar os links públicos e o fluxo n8n dos ex-clientes (Instituto da Indústria, Gabriela Brito e Fabio Telles).

## 11. Segurança

- Cada usuário de cliente só lê e altera leads do próprio `cliente_id`. A regra vale no banco (RLS) e nas rotas de API, e não só na tela.
- As chaves do WhatsTracker e do Meta ficam em variáveis de ambiente. Nada de chave no código, no cofre ou no chat.
- Anotações internas nunca vão para o portal do cliente.

## 12. Ordem de construção

| Entrega | Prazo | Conteúdo | Pronto quando |
|---|---|---|---|
| 1. Base | dias 1 a 3 | 4.2 completo (tabelas, colunas, migração das etapas, ajuste de quem grava em `leads.etapa`) | Os 139 leads atuais estão nas etapas novas, e mudanças geram eventos com autor |
| 2. Portal novo + Camilo | dias 4 a 7 | Seção 5 (sem o histórico de conversa) · usuário do atendente do Camilo · treino de 15 min | O atendente do Camilo move leads sozinho por uma semana |
| 3. Hábito + Meta | semana 2 | Seção 8 · seção 7 para o Camilo | **1º case:** venda real ligada ao anúncio, com custo por venda e ROAS no portal |
| 4. Visão do Hildeberto | semana 3 | Seção 4.3 (com histórico) · seção 6 · seção 10 | A Carteira mostra os 6 clientes, e os totais de leads batem com o WhatsTracker |
| 5. Demais clientes | semana 4 em diante | Um cliente por vez (ordem: OBELE, Face e Corpo, Obele Natal, JC Motos, Parmegiana): etapas do nicho, usuários, treino e `capi_origem = axven` · skill `axven-relatorio` lendo os dados novos · seção 9, se o teste der certo | Cada cliente com mais de 50% dos leads atualizados |

## 13. Como validar cada entrega

- **Banco:** contagens antes e depois da migração conferidas por consulta (nenhum lead perdido, nenhum sem etapa válida).
- **Sincronização:** o total importado por cliente é igual ao total da tabela do WhatsTracker. Rodar duas vezes seguidas não cria nada novo.
- **Portal:** teste com um usuário de cliente A tentando abrir dados do cliente B (tem que ser negado na tela e na API). Mover um lead cria um evento com autor.
- **Meta:** evento de teste no Events Manager (código de teste) antes do primeiro envio real, e depois a primeira venda real aparecendo no Events Manager com valor.
- **Lembrete:** envio para o WhatsApp do Hildeberto antes de ligar para atendentes.

## 14. Fora desta especificação

IA que sugere a etapa a partir da conversa · caixa de entrada para responder pelo portal · marca própria e app · troca da captura do WhatsTracker por captura própria · integração com KOMMO e Zonic · responsável por lead (divisão da carteira entre atendentes).

## 15. Pendências antes ou durante o plano

- [ ] Resultado do teste de histórico na OBELE (seção 9)
- [ ] Confirmar o local de `lib/metaCapi.ts` no repositório do Care OS
- [ ] Listar tudo que grava em `leads.etapa` (seção 4.2)
- [ ] Revisar `/dashboard/executiva` e `/dashboard/operacional` (seção 10)
- [ ] Hildeberto: renovar as conexões de WhatsApp (JC Motos e OBELE) e o acesso do WhatsTracker · desativar links e fluxos dos ex-clientes
