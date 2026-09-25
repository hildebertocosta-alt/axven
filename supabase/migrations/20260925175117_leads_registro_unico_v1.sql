-- Registro único de lead dos clientes (CRM Clientes).
-- 1) Lead de formulário Meta: idempotente por leadgen_id (reentregas do Meta não duplicam).
-- 2) Lead de WhatsApp: 1 pessoa = 1 lead aberto por cliente (mensagens seguintes não criam outro).
--    Exceção deliberada à regra "não deduplicar por telefone", que vale para a aquisição da Axven
--    (idempotência por submission). No WhatsApp não existe submission: o telefone é a conversa.
-- 3) Guarda a data original do lead (criado_em_origem) e as respostas do formulário.
-- Mudança aditiva: colunas novas nulas + função nova. O endpoint antigo continua funcionando.

alter table public.leads
  add column if not exists leadgen_id text,
  add column if not exists form_id text,
  add column if not exists respostas_formulario jsonb,
  add column if not exists criado_em_origem timestamptz;

create unique index if not exists leads_cliente_leadgen_uniq
  on public.leads (cliente_id, leadgen_id)
  where leadgen_id is not null;

create or replace function public.registrar_lead_v1(p jsonb)
returns table (lead_id uuid, criado boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente   uuid := (p->>'cliente_id')::uuid;
  v_telefone  text := nullif(btrim(p->>'telefone'), '');
  v_leadgen   text := nullif(btrim(p->>'leadgen_id'), '');
  v_origem_ts timestamptz := nullif(p->>'criado_em_origem', '')::timestamptz;
  v_whatsapp  boolean :=
       coalesce(p->>'tipo_captacao', '') in ('click_to_whatsapp', 'whatsapp_organico')
    or coalesce(p->>'origem', '') in ('whatsapp', 'click_to_whatsapp')
    or coalesce(p->>'plataforma', '') = 'whatsapp';
  v_id uuid;
begin
  if v_cliente is null or nullif(btrim(p->>'nome'), '') is null then
    raise exception 'cliente_id e nome sao obrigatorios';
  end if;

  -- Formulário Meta reentregue: devolve o lead que já existe.
  if v_leadgen is not null then
    select l.id into v_id from leads l where l.cliente_id = v_cliente and l.leadgen_id = v_leadgen;
    if found then
      return query select v_id, false;
      return;
    end if;
  end if;

  -- WhatsApp: trava por cliente+telefone (mensagens chegam em rajada) e reaproveita o lead aberto.
  if v_whatsapp and v_telefone is not null then
    perform pg_advisory_xact_lock(hashtext(v_cliente::text || ':' || v_telefone));

    select l.id into v_id
      from leads l
     where l.cliente_id = v_cliente
       and l.telefone = v_telefone
       and l.etapa not in ('fechado', 'nao_fechou', 'desqualificado')
       and coalesce(l.plataforma, '') <> 'teste'
     order by l.criado_em desc
     limit 1;

    if found then
      -- Completa a atribuição se a 1ª mensagem veio sem anúncio e uma seguinte trouxe.
      update leads set
        ctwaclid          = coalesce(ctwaclid, nullif(p->>'ctwaclid', '')),
        anuncio_source_id = coalesce(anuncio_source_id, nullif(p->>'anuncio_source_id', '')),
        campanha          = coalesce(campanha, nullif(p->>'campanha', '')),
        conjunto          = coalesce(conjunto, nullif(p->>'conjunto', '')),
        anuncio           = coalesce(anuncio, nullif(p->>'anuncio', '')),
        whatsapp_lid      = coalesce(whatsapp_lid, nullif(p->>'whatsapp_lid', '')),
        atualizado_em     = now()
      where id = v_id;
      return query select v_id, false;
      return;
    end if;
  end if;

  insert into leads (
    cliente_id, nome, telefone, email, etapa, origem, campanha, conjunto, anuncio,
    plataforma, ctwaclid, anuncio_source_id, tipo_captacao, page_id, pixel_id, dataset_id,
    whatsapp_lid, leadgen_id, form_id, respostas_formulario, criado_em_origem, criado_em
  ) values (
    v_cliente,
    btrim(p->>'nome'),
    v_telefone,
    nullif(p->>'email', ''),
    'lead',
    coalesce(nullif(p->>'origem', ''), 'Meta Ads'),
    nullif(p->>'campanha', ''),
    nullif(p->>'conjunto', ''),
    nullif(p->>'anuncio', ''),
    nullif(p->>'plataforma', ''),
    nullif(p->>'ctwaclid', ''),
    nullif(p->>'anuncio_source_id', ''),
    nullif(p->>'tipo_captacao', ''),
    nullif(p->>'page_id', ''),
    nullif(p->>'pixel_id', ''),
    nullif(p->>'dataset_id', ''),
    nullif(p->>'whatsapp_lid', ''),
    v_leadgen,
    nullif(p->>'form_id', ''),
    case when jsonb_typeof(p->'respostas_formulario') = 'object' then p->'respostas_formulario' end,
    v_origem_ts,
    -- criado_em = quando o lead aconteceu (reentregas atrasadas do Meta ficam na data certa).
    coalesce(v_origem_ts, now())
  )
  on conflict (cliente_id, leadgen_id) where leadgen_id is not null do nothing
  returning id into v_id;

  if v_id is null then
    -- Corrida entre duas entregas do mesmo leadgen_id: a outra venceu.
    select l.id into v_id from leads l where l.cliente_id = v_cliente and l.leadgen_id = v_leadgen;
    return query select v_id, false;
    return;
  end if;

  return query select v_id, true;
end;
$$;

revoke all on function public.registrar_lead_v1(jsonb) from public, anon, authenticated;
grant execute on function public.registrar_lead_v1(jsonb) to service_role;
