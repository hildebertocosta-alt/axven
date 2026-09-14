create or replace function public.claim_aquisicao_axven_whatsapp_outbox_v1()
returns setof public.aquisicao_axven_whatsapp_outbox
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.aquisicao_axven_whatsapp_outbox%rowtype;
begin
  -- Fecha itens vencidos antes que possam ser enviados. O estado cancelado já
  -- pertence ao contrato vigente e preserva o histórico para auditoria.
  update public.aquisicao_axven_whatsapp_outbox as o
  set status = 'cancelado',
      ultimo_erro = 'agendamento_expirado',
      atualizado_em = now()
  from public.aquisicao_axven_agendamentos as a
  where a.id = o.agendamento_id
    and a.inicio <= now()
    and o.status in ('pendente', 'falhou', 'processando')
    and (o.status <> 'processando' or o.atualizado_em <= now() - interval '10 minutes');

  -- Um item que esgotou tentativas permanece em falhou, mas deixa de ser elegível.
  update public.aquisicao_axven_whatsapp_outbox
  set ultimo_erro = coalesce(ultimo_erro, 'limite_tentativas_excedido'),
      atualizado_em = now()
  where status in ('pendente', 'falhou') and tentativas >= 5;

  select o.* into v_item
  from public.aquisicao_axven_whatsapp_outbox as o
  join public.aquisicao_axven_agendamentos as a on a.id = o.agendamento_id
  where a.status = 'agendado'
    and a.inicio > now()
    and o.tentativas < 5
    and (
      (o.status in ('pendente', 'falhou') and o.disponivel_em <= now())
      or (o.status = 'processando' and o.atualizado_em <= now() - interval '10 minutes')
    )
  order by o.disponivel_em, o.criado_em
  for update of o skip locked
  limit 1;

  if not found then
    return;
  end if;

  update public.aquisicao_axven_whatsapp_outbox
  set status = 'processando',
      tentativas = tentativas + 1,
      ultimo_erro = null,
      atualizado_em = now()
  where id = v_item.id
  returning * into v_item;

  return next v_item;
end;
$$;

revoke all on function public.claim_aquisicao_axven_whatsapp_outbox_v1() from public, anon, authenticated;
grant execute on function public.claim_aquisicao_axven_whatsapp_outbox_v1() to service_role;
