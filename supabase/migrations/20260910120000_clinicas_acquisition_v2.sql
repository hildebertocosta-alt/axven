alter table public.aquisicao_axven_leads
  add column if not exists novos_pacientes_faixa text,
  add column if not exists submission_id uuid;

create unique index if not exists aquisicao_axven_leads_submission_id_unique
  on public.aquisicao_axven_leads (submission_id)
  where submission_id is not null;
