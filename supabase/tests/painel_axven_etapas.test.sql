-- Testes do Painel Axven · Entrega 1. Rodar SEMPRE dentro de: begin; ... rollback;
-- Pré-requisito no mesmo bloco: create temp table _antes as select (select count(*) from public.leads) as leads;

do $$
declare
  v_cliente uuid;
  v_lead uuid;
  v_n int;
  v_txt text;
  v_ok boolean;
  v_row public.leads;
  v_evento public.lead_etapa_eventos;
begin
  -- T1: todo cliente tem as 5 etapas padrão
  select count(*) into v_n from public.clientes c
  where (select count(*) from public.cliente_etapas e where e.cliente_id = c.id) < 5;
  if v_n <> 0 then raise exception 'T1 FALHOU: % clientes sem as 5 etapas', v_n; end if;

  -- T2: o nome da oportunidade segue o nicho (Camilo, imobiliário = Visita)
  select e.nome into v_txt from public.cliente_etapas e join public.clientes c on c.id = e.cliente_id
  where c.nome = 'Camilo Imóveis' and e.chave = 'oportunidade';
  if v_txt is distinct from 'Visita' then raise exception 'T2 FALHOU: oportunidade do Camilo = %', v_txt; end if;

  -- T3: nenhum lead ficou fora do funil do cliente, e nenhum lead sumiu
  select count(*) into v_n from public.leads l
  where not exists (select 1 from public.cliente_etapas e where e.cliente_id = l.cliente_id and e.chave = l.etapa and e.ativo);
  if v_n <> 0 then raise exception 'T3 FALHOU: % leads com etapa inválida', v_n; end if;
  select count(*) into v_n from public.leads;
  if v_n <> (select leads from _antes) then raise exception 'T3 FALHOU: % leads depois, % antes', v_n, (select leads from _antes); end if;

  -- T4: todo lead tem evento de entrada, e as etapas antigas sumiram
  select count(*) into v_n from public.leads l
  where not exists (select 1 from public.lead_etapa_eventos e where e.lead_id = l.id and e.etapa_anterior is null);
  if v_n <> 0 then raise exception 'T4 FALHOU: % leads sem evento de entrada', v_n; end if;
  select count(*) into v_n from public.leads where etapa in ('agendado','proposta_enviada','nao_fechou','desqualificado');
  if v_n <> 0 then raise exception 'T4 FALHOU: % leads ainda em etapa antiga', v_n; end if;

  -- T5: cliente novo ganha as 5 etapas sozinho, e o lead novo ganha evento de entrada
  insert into public.clientes (nome, nicho, status_pagamento) values ('Cliente Teste Plano', 'Imobiliário', 'em_dia')
  returning id into v_cliente;
  select count(*) into v_n from public.cliente_etapas where cliente_id = v_cliente;
  if v_n <> 5 then raise exception 'T5 FALHOU: cliente novo com % etapas', v_n; end if;
  insert into public.leads (nome, telefone, cliente_id) values ('Lead Teste', '5581999990000', v_cliente) returning id into v_lead;
  select count(*) into v_n from public.lead_etapa_eventos where lead_id = v_lead and etapa_anterior is null and etapa_nova = 'lead';
  if v_n <> 1 then raise exception 'T5 FALHOU: % eventos de entrada para o lead novo', v_n; end if;

  -- T6: quem ainda grava "agendado" (n8n antigo) cai em "oportunidade" e marca qualificado
  update public.leads set etapa = 'agendado' where id = v_lead returning * into v_row;
  if v_row.etapa <> 'oportunidade' or not v_row.qualificado then
    raise exception 'T6 FALHOU: etapa=% qualificado=%', v_row.etapa, v_row.qualificado;
  end if;

  -- T6b: quem grava "desqualificado" cai em "perdido" com motivo fora_do_perfil
  update public.leads set etapa = 'desqualificado' where id = v_lead returning * into v_row;
  if v_row.etapa <> 'perdido' or v_row.motivo_perda is distinct from 'fora_do_perfil' then
    raise exception 'T6b FALHOU: etapa=% motivo=%', v_row.etapa, v_row.motivo_perda;
  end if;

  -- T7: venda sem valor é recusada
  v_ok := false;
  begin
    update public.leads set etapa = 'fechado', valor_conversao = null where id = v_lead;
  exception when others then
    v_ok := sqlerrm like '%valor_venda_obrigatorio%';
  end;
  if not v_ok then raise exception 'T7 FALHOU: venda sem valor não foi recusada corretamente'; end if;

  -- T8: sair de Perdido limpa o motivo; voltar para Perdido sem motivo é recusado
  update public.leads set etapa = 'qualificado' where id = v_lead returning * into v_row;
  if v_row.motivo_perda is not null then raise exception 'T8 FALHOU: motivo não foi limpo (%)', v_row.motivo_perda; end if;
  v_ok := false;
  begin
    update public.leads set etapa = 'perdido' where id = v_lead;
  exception when others then
    v_ok := sqlerrm like '%motivo_perda_obrigatorio%';
  end;
  if not v_ok then raise exception 'T8 FALHOU: perda sem motivo não foi recusada corretamente'; end if;

  -- T9: etapa que não existe no funil do cliente é recusada
  v_ok := false;
  begin
    update public.leads set etapa = 'visita_feita' where id = v_lead;
  exception when others then
    v_ok := sqlerrm like '%etapa_invalida%';
  end;
  if not v_ok then raise exception 'T9 FALHOU: etapa inexistente não foi recusada'; end if;

  -- T10: a RPC registra venda com valor arredondado, origem e autor
  v_row := public.atualizar_etapa_lead_v1(v_lead, v_cliente, 'fechado', 1500.456, 'BRL', now(), null, null, 'axven', null);
  if v_row.etapa <> 'fechado' or v_row.valor_conversao <> 1500.46 then
    raise exception 'T10 FALHOU: etapa=% valor=%', v_row.etapa, v_row.valor_conversao;
  end if;
  select * into v_evento from public.lead_etapa_eventos where lead_id = v_lead order by criado_em desc, id desc limit 1;
  if v_evento.etapa_nova <> 'fechado' or v_evento.valor <> 1500.46 or v_evento.origem <> 'axven' then
    raise exception 'T10 FALHOU: evento=% valor=% origem=%', v_evento.etapa_nova, v_evento.valor, v_evento.origem;
  end if;
  if current_setting('axven.origem', true) is distinct from '' then
    raise exception 'T10 FALHOU: RPC deixou axven.origem = %', current_setting('axven.origem', true);
  end if;

  -- T11: a RPC não acha lead de outro cliente
  v_ok := false;
  begin
    perform public.atualizar_etapa_lead_v1(v_lead, gen_random_uuid(), 'qualificado');
  exception when others then
    v_ok := sqlerrm like '%lead_nao_encontrado%';
  end;
  if not v_ok then raise exception 'T11 FALHOU: RPC alterou lead passando outro cliente'; end if;

  -- T12: repetir a mesma etapa não cria evento duplicado
  select count(*) into v_n from public.lead_etapa_eventos where lead_id = v_lead;
  perform public.atualizar_etapa_lead_v1(v_lead, v_cliente, 'fechado', 1500.46, 'BRL', now(), null, null, 'axven', null);
  if (select count(*) from public.lead_etapa_eventos where lead_id = v_lead) <> v_n then
    raise exception 'T12 FALHOU: evento duplicado para a mesma etapa';
  end if;

  -- T13: origem inválida é recusada
  v_ok := false;
  begin
    perform public.atualizar_etapa_lead_v1(v_lead, v_cliente, 'qualificado', null, null, null, null, null, 'n8n', null);
  exception when others then
    v_ok := sqlerrm like '%origem_invalida%';
  end;
  if not v_ok then raise exception 'T13 FALHOU: origem inválida aceita'; end if;
end $$;

-- T14/T15: o usuário do portal só alcança os leads e as etapas do próprio cliente (RLS)
insert into auth.users (id, email, aud, role)
values ('00000000-0000-4000-8000-00000000a001', 'teste-plano@axven.invalid', 'authenticated', 'authenticated');
insert into public.crm_usuarios (user_id, cliente_id)
select '00000000-0000-4000-8000-00000000a001', id from public.clientes where nome = 'Cliente Teste Plano';

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000a001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare v_n int;
begin
  with alterados as (update public.leads set atualizado_em = now() returning id)
  select count(*) into v_n from alterados;
  if v_n <> 1 then raise exception 'T14 FALHOU: usuário do portal alcançou % leads (esperado 1)', v_n; end if;

  update public.leads set etapa = 'oportunidade' where nome = 'Lead Teste';

  select count(*) into v_n from public.cliente_etapas;
  if v_n <> 5 then raise exception 'T15 FALHOU: portal vê % etapas (esperado 5)', v_n; end if;
end $$;

reset role;
select set_config('request.jwt.claims', '', true);

-- T16: a mudança feita pelo portal fica registrada com origem portal e o autor
do $$
declare v_evento public.lead_etapa_eventos;
begin
  select e.* into v_evento from public.lead_etapa_eventos e
  join public.leads l on l.id = e.lead_id
  where l.nome = 'Lead Teste'
  order by e.criado_em desc, e.id desc limit 1;
  if v_evento.etapa_nova <> 'oportunidade' or v_evento.origem <> 'portal'
     or v_evento.autor_user_id is distinct from '00000000-0000-4000-8000-00000000a001'::uuid then
    raise exception 'T16 FALHOU: etapa=% origem=% autor=%', v_evento.etapa_nova, v_evento.origem, v_evento.autor_user_id;
  end if;
end $$;

-- T17: lead Perdido que volta a chamar no WhatsApp vira lead novo (registrar_lead_v1)
-- T18: não dá para apagar o valor de uma venda sem mudar a etapa
-- T19: não dá para apagar o motivo de uma perda sem mudar a etapa
do $$
declare
  v_cliente uuid;
  v_perdido uuid;
  v_venda uuid;
  v_novo record;
  v_ok boolean;
begin
  select id into v_cliente from public.clientes where nome = 'Cliente Teste Plano';

  insert into public.leads (nome, telefone, cliente_id, plataforma) values ('Lead Perdido WA', '5581988887777', v_cliente, 'whatsapp')
  returning id into v_perdido;
  update public.leads set etapa = 'perdido', motivo_perda = 'preco' where id = v_perdido;
  select * into v_novo from public.registrar_lead_v1(jsonb_build_object(
    'cliente_id', v_cliente, 'nome', 'Lead Perdido WA', 'telefone', '5581988887777', 'plataforma', 'whatsapp'));
  if not v_novo.criado or v_novo.lead_id = v_perdido then
    raise exception 'T17 FALHOU: lead perdido que voltou não virou lead novo (criado=%)', v_novo.criado;
  end if;

  insert into public.leads (nome, telefone, cliente_id) values ('Lead Venda', '5581977776666', v_cliente) returning id into v_venda;
  update public.leads set etapa = 'fechado', valor_conversao = 500 where id = v_venda;
  v_ok := false;
  begin
    update public.leads set valor_conversao = null where id = v_venda;
  exception when others then
    v_ok := sqlerrm like '%valor_venda_obrigatorio%';
  end;
  if not v_ok then raise exception 'T18 FALHOU: valor da venda foi apagado sem mudar a etapa'; end if;

  v_ok := false;
  begin
    update public.leads set motivo_perda = null where id = v_perdido;
  exception when others then
    v_ok := sqlerrm like '%motivo_perda_obrigatorio%';
  end;
  if not v_ok then raise exception 'T19 FALHOU: motivo da perda foi apagado sem mudar a etapa'; end if;
end $$;

select 'TODOS OS TESTES PASSARAM' as resultado;
