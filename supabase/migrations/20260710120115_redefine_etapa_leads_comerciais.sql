alter table public.leads_comerciais drop constraint leads_comerciais_etapa_check;
alter table public.leads_comerciais alter column etapa set default 'novo_lead';
alter table public.leads_comerciais add constraint leads_comerciais_etapa_check
  check (etapa in ('novo_lead','qualificando','proposta_enviada','negociacao','fechado_ganho','perdido'));
