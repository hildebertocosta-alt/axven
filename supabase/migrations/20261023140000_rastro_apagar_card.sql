-- Conector do Axven Rastro: contato apagado no Rastro a pedido do titular (LGPD).
-- O Rastro chama rastro_apagar_card com o mesmo segredo do conector. Se o card era venda, o lead fica só como
-- registro da venda, sem dado pessoal ("Contato apagado"); se não, o lead sai (com mensagens e histórico em cascata).
create or replace function public.rastro_apagar_card(p_cliente_id uuid, p_segredo text, p_card_id text, p_manter_venda boolean)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_hash text;
  v_lead uuid;
begin
  select c.segredo_hash into v_hash from public.rastro_conectores c where c.cliente_id = p_cliente_id and c.ativo;
  if v_hash is null or v_hash <> encode(sha256(convert_to(coalesce(p_segredo, ''), 'UTF8')), 'hex') then
    raise exception using message = 'nao_autorizado', errcode = '28000';
  end if;

  select l.id into v_lead from public.leads l
  where l.cliente_id = p_cliente_id and l.origem_tabela = 'rastro' and l.origem_id = p_card_id;
  if v_lead is null then
    return jsonb_build_object('ok', true, 'lead', null);
  end if;

  perform set_config('axven.origem', 'sync', true);
  if p_manter_venda then
    update public.leads set
      nome = 'Contato apagado', telefone = null, email = null, ctwaclid = null, whatsapp_lid = null,
      respostas_formulario = null, motivo_perda_detalhe = null, atualizado_em = now()
    where id = v_lead;
    delete from public.leads_mensagens where lead_id = v_lead;
  else
    delete from public.leads where id = v_lead;
  end if;
  return jsonb_build_object('ok', true, 'lead', v_lead, 'manteve_venda', p_manter_venda);
end;
$$;
revoke all on function public.rastro_apagar_card(uuid, text, text, boolean) from public;
grant execute on function public.rastro_apagar_card(uuid, text, text, boolean) to anon, authenticated, service_role;
