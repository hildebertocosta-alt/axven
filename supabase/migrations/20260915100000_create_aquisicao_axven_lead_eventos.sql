create table if not exists public.aquisicao_axven_lead_eventos (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.aquisicao_axven_leads(id) on delete cascade,
  tipo_evento text not null,
  etapa_anterior text null,
  etapa_nova text null,
  motivo text null,
  metadata jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  constraint aquisicao_axven_lead_eventos_tipo_check
    check (tipo_evento in ('mudanca_etapa')),
  constraint aquisicao_axven_lead_eventos_etapa_anterior_check
    check (etapa_anterior is null or etapa_anterior in ('lead','qualificado','agendado','proposta_enviada','fechado','nao_fechou','desqualificado')),
  constraint aquisicao_axven_lead_eventos_etapa_nova_check
    check (etapa_nova is null or etapa_nova in ('lead','qualificado','agendado','proposta_enviada','fechado','nao_fechou','desqualificado'))
);

create index if not exists idx_aquisicao_axven_lead_eventos_lead_data
  on public.aquisicao_axven_lead_eventos (lead_id, criado_em desc);

alter table public.aquisicao_axven_lead_eventos enable row level security;
revoke all on table public.aquisicao_axven_lead_eventos from public, anon, authenticated;

create or replace function public.atualizar_etapa_aquisicao_axven_lead_v1(
  p_lead_id uuid,
  p_etapa text,
  p_motivo text default null,
  p_valor_venda numeric default null,
  p_moeda text default null,
  p_venda_em timestamptz default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lead public.aquisicao_axven_leads%rowtype;
  v_atualizado public.aquisicao_axven_leads%rowtype;
  v_agendamento public.aquisicao_axven_agendamentos%rowtype;
  v_evento public.aquisicao_axven_lead_eventos%rowtype;
  v_motivo text := nullif(trim(coalesce(p_motivo, '')), '');
  v_metadata jsonb := '{}'::jsonb;
begin
  if p_etapa not in ('lead','qualificado','agendado','proposta_enviada','fechado','nao_fechou','desqualificado') then
    raise exception using message = 'etapa_invalida', errcode = '22023';
  end if;

  select * into v_lead
  from public.aquisicao_axven_leads
  where id = p_lead_id
  for update;

  if not found then
    raise exception using message = 'lead_nao_encontrado', errcode = 'P0002';
  end if;

  if p_etapa = v_lead.etapa then
    return jsonb_build_object('lead', to_jsonb(v_lead), 'event', null, 'idempotent', true);
  end if;

  if p_etapa in ('nao_fechou', 'desqualificado') and v_motivo is null then
    raise exception using message = 'motivo_obrigatorio', errcode = '22023';
  end if;

  if p_etapa = 'agendado' then
    select * into v_agendamento
    from public.aquisicao_axven_agendamentos
    where lead_id = p_lead_id and status = 'agendado'
    order by inicio desc
    limit 1;
    if not found then
      raise exception using message = 'agendamento_ausente', errcode = 'P0001';
    end if;
    v_metadata := jsonb_build_object('agendamento_id', v_agendamento.id, 'inicio', v_agendamento.inicio);
  end if;

  if p_etapa = 'fechado' then
    if p_valor_venda is null or p_valor_venda <= 0 then
      raise exception using message = 'valor_venda_obrigatorio', errcode = '22023';
    end if;
    if p_moeda not in ('BRL','USD','EUR') then
      raise exception using message = 'moeda_invalida', errcode = '22023';
    end if;
    if p_venda_em is null then
      raise exception using message = 'data_venda_obrigatoria', errcode = '22023';
    end if;
    v_metadata := jsonb_build_object('valor_venda', round(p_valor_venda, 2), 'moeda', p_moeda, 'venda_em', p_venda_em);
  end if;

  update public.aquisicao_axven_leads
  set etapa = p_etapa,
      qualificado = case
        when p_etapa in ('qualificado','agendado','proposta_enviada','fechado') then true
        else qualificado
      end,
      agendado_em = case
        when p_etapa = 'agendado' then coalesce(agendado_em, v_agendamento.inicio)
        else agendado_em
      end,
      valor_venda = case when p_etapa = 'fechado' then round(p_valor_venda, 2) else valor_venda end,
      moeda = case when p_etapa = 'fechado' then p_moeda else moeda end,
      venda_em = case when p_etapa = 'fechado' then p_venda_em else venda_em end,
      atualizado_em = now()
  where id = p_lead_id
  returning * into v_atualizado;

  insert into public.aquisicao_axven_lead_eventos
    (lead_id, tipo_evento, etapa_anterior, etapa_nova, motivo, metadata)
  values
    (p_lead_id, 'mudanca_etapa', v_lead.etapa, p_etapa, v_motivo, v_metadata)
  returning * into v_evento;

  return jsonb_build_object('lead', to_jsonb(v_atualizado), 'event', to_jsonb(v_evento), 'idempotent', false);
end;
$$;

revoke all on function public.atualizar_etapa_aquisicao_axven_lead_v1(uuid,text,text,numeric,text,timestamptz) from public, anon, authenticated;
grant execute on function public.atualizar_etapa_aquisicao_axven_lead_v1(uuid,text,text,numeric,text,timestamptz) to service_role;
