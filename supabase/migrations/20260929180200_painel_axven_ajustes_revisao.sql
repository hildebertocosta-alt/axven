-- Painel Axven · Entrega 1: ajustes da revisão final.
-- 1) registrar_lead_v1 passa a tratar "perdido" como encerrado: quem foi perdido e volta a chamar
--    no WhatsApp vira lead novo (antes a etapa nova "perdido" era vista como "aberta").
-- 2) Venda sempre com valor e perda sempre com motivo, mesmo em updates que não mexem na etapa
--    (o gatilho de validação só dispara quando a etapa muda). Os nomes das restrições contêm os
--    códigos que o app já traduz (valor_venda_obrigatorio / motivo_perda_obrigatorio).

create or replace function public.registrar_lead_v1(p jsonb)
returns table(lead_id uuid, criado boolean)
language plpgsql
security definer
set search_path to 'public'
as $function$
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
  -- Encerrados (Venda e Perdido, e as chaves antigas) não são reaproveitados: quem volta vira lead novo.
  if v_whatsapp and v_telefone is not null then
    perform pg_advisory_xact_lock(hashtext(v_cliente::text || ':' || v_telefone));

    select l.id into v_id
      from leads l
     where l.cliente_id = v_cliente
       and l.telefone = v_telefone
       and l.etapa not in ('fechado', 'perdido', 'nao_fechou', 'desqualificado')
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
$function$;

alter table public.leads drop constraint if exists leads_valor_venda_obrigatorio;
alter table public.leads add constraint leads_valor_venda_obrigatorio
  check (etapa <> 'fechado' or coalesce(valor_conversao, 0) > 0);

alter table public.leads drop constraint if exists leads_motivo_perda_obrigatorio;
alter table public.leads add constraint leads_motivo_perda_obrigatorio
  check (etapa <> 'perdido' or motivo_perda is not null);
