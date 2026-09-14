alter table public.aquisicao_axven_whatsapp_outbox
  add column if not exists provider_message_id text null,
  add column if not exists envio_iniciado_em timestamptz null,
  add column if not exists revisao_necessaria boolean not null default false;

create unique index if not exists uq_aquisicao_axven_outbox_provider_message_id
  on public.aquisicao_axven_whatsapp_outbox (provider_message_id)
  where provider_message_id is not null;

create index if not exists idx_aquisicao_axven_outbox_revisao
  on public.aquisicao_axven_whatsapp_outbox (revisao_necessaria, atualizado_em)
  where revisao_necessaria = true;

-- Tentativas anteriores à persistência do ID do provider possuem resultado
-- inerentemente ambíguo. Preserva os registros e impede reenvio automático.
update public.aquisicao_axven_whatsapp_outbox
set revisao_necessaria = true,
    ultimo_erro = 'resultado_ambiguo_provider',
    atualizado_em = now()
where status = 'falhou'
  and tentativas > 0
  and provider_message_id is null;

create or replace function public.claim_aquisicao_axven_whatsapp_outbox_v1()
returns setof public.aquisicao_axven_whatsapp_outbox
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.aquisicao_axven_whatsapp_outbox%rowtype;
begin
  update public.aquisicao_axven_whatsapp_outbox as o
  set status = 'cancelado', ultimo_erro = 'agendamento_expirado', atualizado_em = now()
  from public.aquisicao_axven_agendamentos as a
  where a.id = o.agendamento_id
    and a.inicio <= now()
    and o.provider_message_id is null
    and o.status in ('pendente', 'falhou', 'processando')
    and (o.status <> 'processando' or o.atualizado_em <= now() - interval '10 minutes');

  -- Se o processo caiu depois de registrar o início do POST, o resultado é
  -- ambíguo. Falha fechada para revisão, sem novo envio automático.
  update public.aquisicao_axven_whatsapp_outbox
  set status = 'falhou', revisao_necessaria = true,
      ultimo_erro = 'resultado_ambiguo_provider', atualizado_em = now()
  where status = 'processando'
    and provider_message_id is null
    and envio_iniciado_em is not null
    and atualizado_em <= now() - interval '10 minutes';

  update public.aquisicao_axven_whatsapp_outbox
  set ultimo_erro = coalesce(ultimo_erro, 'limite_tentativas_excedido'), atualizado_em = now()
  where status in ('pendente', 'falhou') and tentativas >= 5;

  select o.* into v_item
  from public.aquisicao_axven_whatsapp_outbox as o
  join public.aquisicao_axven_agendamentos as a on a.id = o.agendamento_id
  where a.status = 'agendado'
    and a.inicio > now()
    and o.tentativas < 5
    and o.provider_message_id is null
    and o.revisao_necessaria = false
    and (
      (o.status in ('pendente', 'falhou') and o.disponivel_em <= now())
      or (o.status = 'processando' and o.envio_iniciado_em is null and o.atualizado_em <= now() - interval '10 minutes')
    )
  order by o.disponivel_em, o.criado_em
  for update of o skip locked
  limit 1;

  if not found then return; end if;

  update public.aquisicao_axven_whatsapp_outbox
  set status = 'processando', tentativas = tentativas + 1,
      envio_iniciado_em = null, revisao_necessaria = false,
      ultimo_erro = null, atualizado_em = now()
  where id = v_item.id
  returning * into v_item;

  return next v_item;
end;
$$;

revoke all on function public.claim_aquisicao_axven_whatsapp_outbox_v1() from public, anon, authenticated;
grant execute on function public.claim_aquisicao_axven_whatsapp_outbox_v1() to service_role;
