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
