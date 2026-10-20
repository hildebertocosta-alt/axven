-- Conector do Axven Rastro: cada card do funil do Rastro chega aqui como lead do cliente.
-- O Rastro chama rastro_receber_card com a chave pública do Painel e um segredo por cliente (só o hash fica aqui).
-- Um card = um lead (origem_tabela 'rastro' + origem_id = id do card); cada mudança atualiza o mesmo lead.
-- A venda que chega por aqui NÃO vai ao Meta pelo Painel: quem envia a conversão é o próprio Rastro.

create table if not exists public.rastro_conectores (
  cliente_id uuid primary key references public.clientes (id) on delete cascade,
  segredo_hash text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  ultimo_recebido_em timestamptz
);
alter table public.rastro_conectores enable row level security;
revoke all on public.rastro_conectores from anon, authenticated;

-- Gera (ou troca) o segredo de um cliente. Só a chave secreta (service_role) chama; o segredo volta uma vez.
create or replace function public.rastro_conectar(p_cliente_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  v_segredo text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  if not exists (select 1 from public.clientes c where c.id = p_cliente_id) then
    raise exception using message = 'cliente_nao_encontrado', errcode = '22023';
  end if;
  insert into public.rastro_conectores (cliente_id, segredo_hash)
  values (p_cliente_id, encode(sha256(convert_to(v_segredo, 'UTF8')), 'hex'))
  on conflict (cliente_id) do update set segredo_hash = excluded.segredo_hash, ativo = true;
  return v_segredo;
end;
$$;
revoke all on function public.rastro_conectar(uuid) from public, anon, authenticated;
grant execute on function public.rastro_conectar(uuid) to service_role;

create or replace function public.rastro_receber_card(p_cliente_id uuid, p_segredo text, p_card jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_hash text;
  v_tipo text := p_card ->> 'grupo';
  v_chave text;
  v_motivo text;
  v_detalhe text;
  v_lead uuid;
  v_valor numeric;
begin
  select c.segredo_hash into v_hash from public.rastro_conectores c where c.cliente_id = p_cliente_id and c.ativo;
  if v_hash is null or v_hash <> encode(sha256(convert_to(coalesce(p_segredo, ''), 'UTF8')), 'hex') then
    raise exception using message = 'nao_autorizado', errcode = '28000';
  end if;
  if coalesce(p_card ->> 'card_id', '') !~ '^[0-9a-f-]{36}$' then
    raise exception using message = 'card_invalido', errcode = '22023';
  end if;
  if v_tipo is null or v_tipo not in ('novo', 'qualificacao', 'oportunidade', 'venda', 'perdido') then
    raise exception using message = 'grupo_invalido', errcode = '22023';
  end if;

  -- etapa do cliente com o mesmo tipo do grupo do Rastro (lead, qualificado, oportunidade, fechado, perdido)
  select e.chave into v_chave from public.cliente_etapas e
  where e.cliente_id = p_cliente_id and e.tipo = v_tipo and e.ativo order by e.ordem limit 1;
  if v_chave is null then
    raise exception using message = 'etapa_invalida', errcode = '22023';
  end if;

  -- motivos do nicho que o Painel não tem viram "outro", com o nome do motivo no detalhe
  if v_tipo = 'perdido' then
    v_motivo := p_card ->> 'motivo_chave';
    v_detalhe := nullif(btrim(coalesce(p_card ->> 'motivo_detalhe', '')), '');
    if v_motivo is null or v_motivo not in ('preco', 'parou_de_responder', 'sem_interesse', 'comprou_em_outro_lugar', 'fora_do_perfil', 'outro') then
      v_detalhe := concat_ws(': ', nullif(p_card ->> 'motivo_rotulo', ''), v_detalhe);
      v_motivo := 'outro';
    end if;
  end if;
  v_valor := case when v_tipo = 'venda' then nullif(p_card ->> 'valor', '')::numeric end;

  perform set_config('axven.origem', 'sync', true);
  insert into public.leads (
    nome, telefone, etapa, cliente_id, origem, plataforma, ctwaclid, anuncio_source_id,
    valor_conversao, moeda, data_conversao, motivo_perda, motivo_perda_detalhe,
    criado_em_origem, origem_tabela, origem_id, criado_em, atualizado_em
  ) values (
    coalesce(nullif(btrim(p_card ->> 'nome'), ''), 'Contato do Rastro'),
    nullif(p_card ->> 'telefone', ''),
    v_chave,
    p_cliente_id,
    case when nullif(p_card ->> 'ctwa_clid', '') is not null then 'WhatsApp Ads' else 'WhatsApp Orgânico' end,
    coalesce(nullif(p_card ->> 'plataforma', ''), 'whatsapp'),
    nullif(p_card ->> 'ctwa_clid', ''),
    nullif(p_card ->> 'anuncio_id', ''),
    v_valor,
    'BRL',
    case when v_tipo = 'venda' then coalesce(nullif(p_card ->> 'ganho_em', '')::timestamptz, now()) end,
    v_motivo,
    left(v_detalhe, 500),
    nullif(p_card ->> 'criado_em', '')::timestamptz,
    'rastro',
    p_card ->> 'card_id',
    now(),
    now()
  )
  on conflict (cliente_id, origem_tabela, origem_id) where origem_id is not null do update set
    nome = excluded.nome,
    telefone = coalesce(excluded.telefone, public.leads.telefone),
    etapa = excluded.etapa,
    origem = excluded.origem,
    plataforma = excluded.plataforma,
    ctwaclid = coalesce(excluded.ctwaclid, public.leads.ctwaclid),
    anuncio_source_id = coalesce(excluded.anuncio_source_id, public.leads.anuncio_source_id),
    valor_conversao = coalesce(excluded.valor_conversao, public.leads.valor_conversao),
    data_conversao = coalesce(excluded.data_conversao, public.leads.data_conversao),
    motivo_perda = excluded.motivo_perda,
    motivo_perda_detalhe = excluded.motivo_perda_detalhe,
    atualizado_em = now()
  returning id into v_lead;

  update public.rastro_conectores set ultimo_recebido_em = now() where cliente_id = p_cliente_id;
  return jsonb_build_object('ok', true, 'lead_id', v_lead, 'etapa', v_chave);
end;
$$;
revoke all on function public.rastro_receber_card(uuid, text, jsonb) from public;
grant execute on function public.rastro_receber_card(uuid, text, jsonb) to anon, authenticated, service_role;
