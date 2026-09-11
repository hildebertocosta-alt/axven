alter table public.aquisicao_axven_leads
  add column if not exists meta_event_id text;

create unique index if not exists aquisicao_axven_leads_meta_event_id_unique
  on public.aquisicao_axven_leads (meta_event_id)
  where meta_event_id is not null;
