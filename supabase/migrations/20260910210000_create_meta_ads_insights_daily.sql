create table if not exists public.meta_ads_insights_daily (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  meta_account_id text not null,
  metric_date date not null,
  campaign_id text not null,
  campaign_name text,
  adset_id text not null,
  adset_name text,
  ad_id text not null,
  ad_name text,
  spend numeric(16, 4) not null default 0 check (spend >= 0),
  impressions bigint not null default 0 check (impressions >= 0),
  reach bigint not null default 0 check (reach >= 0),
  clicks bigint not null default 0 check (clicks >= 0),
  ctr numeric(16, 8) not null default 0 check (ctr >= 0),
  cpc numeric(16, 8) not null default 0 check (cpc >= 0),
  cpm numeric(16, 8) not null default 0 check (cpm >= 0),
  leads numeric(16, 4) not null default 0 check (leads >= 0),
  lead_action_type text,
  currency text not null,
  account_timezone text not null,
  source text not null default 'meta_marketing_api' check (source = 'meta_marketing_api'),
  api_version text not null,
  synced_at timestamp with time zone not null default now(),
  unique (cliente_id, meta_account_id, metric_date, ad_id)
);

create index if not exists meta_ads_insights_daily_client_date_idx
  on public.meta_ads_insights_daily (cliente_id, metric_date desc);
create index if not exists meta_ads_insights_daily_campaign_idx
  on public.meta_ads_insights_daily (cliente_id, campaign_id, metric_date desc);
create index if not exists meta_ads_insights_daily_adset_idx
  on public.meta_ads_insights_daily (cliente_id, adset_id, metric_date desc);

alter table public.meta_ads_insights_daily enable row level security;
revoke all on table public.meta_ads_insights_daily from anon, authenticated;

comment on table public.meta_ads_insights_daily is
  'Métricas diárias por anúncio, sincronizadas da Meta Marketing API. Acesso somente server-side.';
