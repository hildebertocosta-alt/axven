-- Teste do Conector do Rastro. Termina sempre com erro para nada ficar gravado.
-- Sucesso -> "TESTE_CONECTOR_OK". Usa a OBELE só dentro da transação.
do $$
declare
  cli uuid;
  seg text;
  card text := gen_random_uuid()::text;
  r jsonb;
  n int;
  l public.leads;
  card2 text := gen_random_uuid()::text;
begin
  select id into cli from public.clientes where nome = 'OBELE' limit 1;
  seg := public.rastro_conectar(cli);

  begin
    r := public.rastro_receber_card(cli, 'errado', jsonb_build_object('card_id', card, 'grupo', 'novo'));
    raise exception 'FALHOU: segredo errado passou';
  exception when others then
    if sqlerrm <> 'nao_autorizado' then raise; end if;
  end;

  r := public.rastro_receber_card(cli, seg, jsonb_build_object('card_id', card, 'grupo', 'novo', 'nome', 'Lead Teste Rastro',
    'telefone', '5581999990001', 'ctwa_clid', 'AfhTESTE', 'anuncio_id', '120249', 'plataforma', 'instagram', 'criado_em', now()));
  select * into l from public.leads where id = (r ->> 'lead_id')::uuid;
  if l.etapa <> 'lead' or l.origem <> 'WhatsApp Ads' or l.ctwaclid <> 'AfhTESTE' or l.origem_tabela <> 'rastro' then
    raise exception 'FALHOU: lead novo (%)', row_to_json(l);
  end if;

  r := public.rastro_receber_card(cli, seg, jsonb_build_object('card_id', card, 'grupo', 'venda', 'nome', 'Lead Teste Rastro', 'valor', 850, 'ganho_em', now()));
  select * into l from public.leads where id = (r ->> 'lead_id')::uuid;
  if l.etapa <> 'fechado' or l.valor_conversao <> 850 or l.ctwaclid <> 'AfhTESTE' then raise exception 'FALHOU: venda'; end if;

  r := public.rastro_receber_card(cli, seg, jsonb_build_object('card_id', card, 'grupo', 'perdido', 'nome', 'Lead Teste Rastro',
    'motivo_chave', 'faltou_avaliacao', 'motivo_rotulo', 'Faltou à avaliação', 'motivo_detalhe', 'não apareceu'));
  select * into l from public.leads where id = (r ->> 'lead_id')::uuid;
  if l.etapa <> 'perdido' or l.motivo_perda <> 'outro' or l.motivo_perda_detalhe <> 'Faltou à avaliação: não apareceu' then
    raise exception 'FALHOU: perdido (%)', row_to_json(l);
  end if;

  select count(*) into n from public.leads where cliente_id = cli and origem_tabela = 'rastro' and origem_id = card;
  if n <> 1 then raise exception 'FALHOU: card virou % leads', n; end if;
  select count(*) into n from public.lead_etapa_eventos where lead_id = l.id and origem = 'sync';
  if n <> 3 then raise exception 'FALHOU: histórico de etapas (%)', n; end if;

  -- contato apagado no Rastro (LGPD): a venda fica anonimizada; card sem venda some; segredo errado é recusado
  r := public.rastro_receber_card(cli, seg, jsonb_build_object('card_id', card, 'grupo', 'venda', 'nome', 'Lead Teste Rastro',
    'telefone', '5581999990001', 'valor', 850, 'ganho_em', now()));
  begin
    r := public.rastro_apagar_card(cli, 'errado', card, true);
    raise exception 'FALHOU: apagar com segredo errado passou';
  exception when others then
    if sqlerrm <> 'nao_autorizado' then raise; end if;
  end;
  r := public.rastro_apagar_card(cli, seg, card, true);
  select * into l from public.leads where cliente_id = cli and origem_tabela = 'rastro' and origem_id = card;
  if l.nome <> 'Contato apagado' or l.telefone is not null or l.ctwaclid is not null or l.email is not null
     or l.valor_conversao <> 850 or l.etapa <> 'fechado' then
    raise exception 'FALHOU: venda anonimizada (%)', row_to_json(l);
  end if;
  r := public.rastro_receber_card(cli, seg, jsonb_build_object('card_id', card2, 'grupo', 'novo', 'nome', 'Outro Lead', 'telefone', '5581999990002'));
  r := public.rastro_apagar_card(cli, seg, card2, false);
  select count(*) into n from public.leads where cliente_id = cli and origem_tabela = 'rastro' and origem_id = card2;
  if n <> 0 then raise exception 'FALHOU: lead sem venda ficou'; end if;
  r := public.rastro_apagar_card(cli, seg, gen_random_uuid()::text, false);
  if (r ->> 'ok')::boolean is not true or r -> 'lead' <> 'null'::jsonb then raise exception 'FALHOU: card que não existe (%)', r; end if;

  raise exception 'TESTE_CONECTOR_OK';
end;
$$;
