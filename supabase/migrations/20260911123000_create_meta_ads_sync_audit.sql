create table if not exists public.meta_ads_sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  periodo_inicio date not null,
  periodo_fim date not null,
  status text not null check (status in ('running', 'success', 'partial', 'failed')),
  clientes_tentados integer not null default 0 check (clientes_tentados >= 0),
  clientes_atualizados integer not null default 0 check (clientes_atualizados >= 0),
  clientes_com_erro integer not null default 0 check (clientes_com_erro >= 0),
  linhas_processadas integer not null default 0 check (linhas_processadas >= 0),
  origem text not null check (origem in ('manual', 'cron')),
  erro_global text,
  check (periodo_fim >= periodo_inicio)
);

create unique index if not exists meta_ads_sync_runs_running_window_uidx
  on public.meta_ads_sync_runs (periodo_inicio, periodo_fim)
  where status = 'running';

create index if not exists meta_ads_sync_runs_started_at_idx
  on public.meta_ads_sync_runs (started_at desc);

create table if not exists public.meta_ads_sync_run_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.meta_ads_sync_runs(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  meta_account_id text not null,
  status text not null check (status in ('running', 'success', 'failed')),
  paginas_processadas integer not null default 0 check (paginas_processadas >= 0),
  linhas_processadas integer not null default 0 check (linhas_processadas >= 0),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  erro text,
  unique (run_id, cliente_id)
);

create index if not exists meta_ads_sync_run_items_client_idx
  on public.meta_ads_sync_run_items (cliente_id, started_at desc);

alter table public.meta_ads_sync_runs enable row level security;
alter table public.meta_ads_sync_run_items enable row level security;

revoke all on table public.meta_ads_sync_runs from anon, authenticated;
revoke all on table public.meta_ads_sync_run_items from anon, authenticated;

comment on table public.meta_ads_sync_runs is
  'Auditoria server-side das execuções do Meta Ads Sync; não armazena credenciais.';
comment on table public.meta_ads_sync_run_items is
  'Resultado sanitizado por cliente em cada execução do Meta Ads Sync.';
