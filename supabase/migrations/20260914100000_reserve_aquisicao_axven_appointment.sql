create or replace function public.reserve_aquisicao_axven_appointment(
  p_lead_id uuid,
  p_inicio timestamptz,
  p_fim timestamptz,
  p_timezone text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lead public.aquisicao_axven_leads%rowtype;
  v_booking public.aquisicao_axven_agendamentos%rowtype;
begin
  if p_timezone <> 'America/Sao_Paulo'
     or p_inicio < now() + interval '8 hours'
     or p_inicio > now() + interval '21 days'
     or p_fim <> p_inicio + interval '45 minutes'
     or extract(isodow from p_inicio at time zone p_timezone) not between 1 and 5
     or (p_inicio at time zone p_timezone)::time not in (time '09:00', time '10:00', time '14:00', time '15:00', time '16:00', time '17:00') then
    raise exception using message = 'agendamento_invalido', errcode = '22023';
  end if;

  select * into v_lead
  from public.aquisicao_axven_leads
  where id = p_lead_id
  for update;

  if not found or v_lead.qualificado is not true then
    raise exception using message = 'lead_nao_qualificado', errcode = 'P0001';
  end if;

  -- Serialize the short reservation section so interval overlap checks cannot race.
  perform pg_advisory_xact_lock(hashtext('aquisicao_axven_agendamentos'));

  if exists (
    select 1 from public.aquisicao_axven_agendamentos
    where lead_id = p_lead_id and status = 'agendado'
  ) then
    raise exception using message = 'lead_ja_agendado', errcode = '23P01';
  end if;

  if exists (
    select 1 from public.aquisicao_axven_agendamentos
    where status = 'agendado'
      and tstzrange(inicio, fim, '[)') && tstzrange(p_inicio, p_fim, '[)')
  ) then
    raise exception using message = 'horario_indisponivel', errcode = '23P01';
  end if;

  insert into public.aquisicao_axven_agendamentos (lead_id, inicio, fim, timezone, status)
  values (p_lead_id, p_inicio, p_fim, p_timezone, 'agendado')
  returning * into v_booking;

  update public.aquisicao_axven_leads
  set etapa = 'agendado', agendado_em = p_inicio, atualizado_em = now()
  where id = p_lead_id;

  if not found then
    raise exception using message = 'falha_atualizacao_lead', errcode = 'P0001';
  end if;

  insert into public.aquisicao_axven_whatsapp_outbox (
    agendamento_id, lead_id, tipo, status, disponivel_em
  ) values (
    v_booking.id, p_lead_id, 'confirmacao_agendamento', 'pendente', now()
  );

  return jsonb_build_object(
    'id', v_booking.id,
    'inicio', v_booking.inicio,
    'fim', v_booking.fim,
    'status', v_booking.status,
    'whatsapp_status', 'pendente'
  );
end;
$$;

revoke all on function public.reserve_aquisicao_axven_appointment(uuid, timestamptz, timestamptz, text) from public, anon, authenticated;
grant execute on function public.reserve_aquisicao_axven_appointment(uuid, timestamptz, timestamptz, text) to service_role;
