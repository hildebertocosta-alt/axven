-- Painel Axven · Entrega 1 (Base): etapas configuráveis por cliente, histórico de etapas e motivos de perda.
-- Spec: docs/superpowers/specs/2026-09-29-painel-axven-design.md (seção 4.2).
-- As regras ficam no banco para valerem para qualquer escritor: portal (RLS), rotas do Next e n8n.

-- 1) Etapas de cada cliente ---------------------------------------------------
create table if not exists public.cliente_etapas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  chave text not null,
  nome text not null,
  tipo text not null,
  ordem integer not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  constraint cliente_etapas_chave_unica unique (cliente_id, chave),
  constraint cliente_etapas_chave_formato check (chave ~ '^[a-z][a-z0-9_]{1,39}$'),
  constraint cliente_etapas_nome_check check (length(trim(nome)) between 1 and 40),
  constraint cliente_etapas_tipo_check check (tipo in ('novo','qualificacao','oportunidade','venda','perdido')),
  constraint cliente_etapas_fixas_check check (
    (chave = 'lead' and tipo = 'novo' and ativo)
    or (chave = 'fechado' and tipo = 'venda' and ativo)
    or (chave = 'perdido' and tipo = 'perdido' and ativo)
    or (chave not in ('lead','fechado','perdido') and tipo in ('qualificacao','oportunidade'))
  )
);

alter table public.cliente_etapas enable row level security;
revoke all on table public.cliente_etapas from public, anon, authenticated;
grant select on table public.cliente_etapas to authenticated;
drop policy if exists "crm_usuario_ve_etapas_do_proprio_cliente" on public.cliente_etapas;
create policy "crm_usuario_ve_etapas_do_proprio_cliente"
on public.cliente_etapas for select to authenticated
using (cliente_id in (select cu.cliente_id from public.crm_usuarios cu where cu.user_id = (select auth.uid())));

create or replace function public.nome_oportunidade_por_nicho(p_nicho text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when p_nicho ilike '%imobili%' then 'Visita'
    when p_nicho ilike '%autom%' or p_nicho ilike '%moto%' then 'Orçamento'
    when p_nicho ilike '%restaurante%' or p_nicho ilike '%delivery%' then 'Pedido'
    when p_nicho ilike '%est_tica%' or p_nicho ilike '%cl_nica%' then 'Avaliação'
    else 'Oportunidade'
  end
$$;

create or replace function public.semear_etapas_cliente_v1(p_cliente_id uuid, p_nicho text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.cliente_etapas (cliente_id, chave, nome, tipo, ordem) values
    (p_cliente_id, 'lead', 'Novo', 'novo', 10),
    (p_cliente_id, 'qualificado', 'Qualificado', 'qualificacao', 20),
    (p_cliente_id, 'oportunidade', public.nome_oportunidade_por_nicho(p_nicho), 'oportunidade', 30),
    (p_cliente_id, 'fechado', 'Venda', 'venda', 90),
    (p_cliente_id, 'perdido', 'Perdido', 'perdido', 100)
  on conflict (cliente_id, chave) do nothing;
$$;
revoke all on function public.semear_etapas_cliente_v1(uuid, text) from public, anon, authenticated;

create or replace function public.clientes_semear_etapas_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.semear_etapas_cliente_v1(new.id, new.nicho);
  return null;
end;
$$;

drop trigger if exists clientes_semear_etapas on public.clientes;
create trigger clientes_semear_etapas
after insert on public.clientes
for each row execute function public.clientes_semear_etapas_trg();

select public.semear_etapas_cliente_v1(c.id, c.nicho) from public.clientes c;

-- 2) Colunas novas ----------------------------------------------------------------
alter table public.leads
  add column if not exists motivo_perda text,
  add column if not exists motivo_perda_detalhe text,
  add column if not exists etapa_alterada_em timestamptz,
  add column if not exists origem_tabela text,
  add column if not exists origem_id text;

alter table public.leads drop constraint if exists leads_etapa_check;
alter table public.leads drop constraint if exists leads_motivo_perda_check;
alter table public.leads add constraint leads_motivo_perda_check check (
  motivo_perda is null
  or motivo_perda in ('preco','parou_de_responder','sem_interesse','comprou_em_outro_lugar','fora_do_perfil','outro')
);
alter table public.leads drop constraint if exists leads_motivo_detalhe_check;
alter table public.leads add constraint leads_motivo_detalhe_check check (
  motivo_perda_detalhe is null or length(motivo_perda_detalhe) <= 500
);
create unique index if not exists leads_cliente_origem_uniq
  on public.leads (cliente_id, origem_tabela, origem_id) where origem_id is not null;
update public.leads set etapa_alterada_em = coalesce(atualizado_em, criado_em, now()) where etapa_alterada_em is null;

alter table public.clientes
  add column if not exists whatstracker_tabela text,
  add column if not exists capi_origem text not null default 'whatstracker';
alter table public.clientes drop constraint if exists clientes_capi_origem_check;
alter table public.clientes add constraint clientes_capi_origem_check check (capi_origem in ('whatstracker','axven'));
create unique index if not exists clientes_whatstracker_tabela_uniq
  on public.clientes (whatstracker_tabela) where whatstracker_tabela is not null;

alter table public.crm_usuarios
  add column if not exists nome text,
  add column if not exists whatsapp text,
  add column if not exists papel text not null default 'atendente',
  add column if not exists recebe_lembrete boolean not null default false;
alter table public.crm_usuarios drop constraint if exists crm_usuarios_papel_check;
alter table public.crm_usuarios add constraint crm_usuarios_papel_check check (papel in ('dono','atendente'));
alter table public.crm_usuarios drop constraint if exists crm_usuarios_whatsapp_check;
alter table public.crm_usuarios add constraint crm_usuarios_whatsapp_check check (whatsapp is null or whatsapp ~ '^[0-9]{10,15}$');

-- 3) Histórico de etapas ---------------------------------------------------------
create table if not exists public.lead_etapa_eventos (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  etapa_anterior text null,
  etapa_nova text not null,
  valor numeric null,
  motivo text null,
  autor_user_id uuid null,
  origem text not null,
  criado_em timestamptz not null default clock_timestamp(),
  constraint lead_etapa_eventos_origem_check check (origem in ('portal','axven','sync','sistema'))
);
create index if not exists idx_lead_etapa_eventos_lead_data on public.lead_etapa_eventos (lead_id, criado_em desc);
create index if not exists idx_lead_etapa_eventos_cliente_data on public.lead_etapa_eventos (cliente_id, criado_em desc);

alter table public.lead_etapa_eventos enable row level security;
revoke all on table public.lead_etapa_eventos from public, anon, authenticated;
grant select on table public.lead_etapa_eventos to authenticated;
drop policy if exists "crm_usuario_ve_eventos_do_proprio_cliente" on public.lead_etapa_eventos;
create policy "crm_usuario_ve_eventos_do_proprio_cliente"
on public.lead_etapa_eventos for select to authenticated
using (cliente_id in (select cu.cliente_id from public.crm_usuarios cu where cu.user_id = (select auth.uid())));

-- 4) Validação da etapa (vale para qualquer escritor) --------------------------
create or replace function public.leads_validar_etapa_trg()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_tipo text;
begin
  -- Etapas antigas (n8n, telas antigas) viram as novas.
  if new.etapa in ('agendado','proposta_enviada') then
    new.etapa := 'oportunidade';
  elsif new.etapa = 'nao_fechou' then
    new.etapa := 'perdido';
    new.motivo_perda := coalesce(new.motivo_perda, 'outro');
  elsif new.etapa = 'desqualificado' then
    new.etapa := 'perdido';
    new.motivo_perda := coalesce(new.motivo_perda, 'fora_do_perfil');
  end if;

  if tg_op = 'UPDATE' and new.etapa is not distinct from old.etapa then
    return new;
  end if;

  select e.tipo into v_tipo
  from public.cliente_etapas e
  where e.cliente_id = new.cliente_id and e.chave = new.etapa and e.ativo;

  if v_tipo is null then
    raise exception using message = 'etapa_invalida', errcode = '22023', detail = coalesce(new.etapa, '(nula)');
  end if;

  if v_tipo = 'venda' then
    if new.valor_conversao is null or new.valor_conversao <= 0 then
      raise exception using message = 'valor_venda_obrigatorio', errcode = '22023';
    end if;
    new.moeda := coalesce(new.moeda, 'BRL');
    new.data_conversao := coalesce(new.data_conversao, now());
  end if;

  if v_tipo = 'perdido' then
    if new.motivo_perda is null then
      raise exception using message = 'motivo_perda_obrigatorio', errcode = '22023';
    end if;
  else
    new.motivo_perda := null;
    new.motivo_perda_detalhe := null;
  end if;

  if v_tipo in ('qualificacao','oportunidade','venda') then
    new.qualificado := true;
  end if;

  new.etapa_alterada_em := now();
  return new;
end;
$$;

drop trigger if exists leads_10_validar_etapa on public.leads;
create trigger leads_10_validar_etapa
before insert or update of etapa on public.leads
for each row execute function public.leads_validar_etapa_trg();

-- 5) Registro do histórico (vale para qualquer escritor) ------------------------
create or replace function public.leads_registrar_evento_etapa_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_autor uuid;
  v_origem text;
begin
  if tg_op = 'UPDATE' and new.etapa is not distinct from old.etapa then
    return null;
  end if;

  v_autor := coalesce(nullif(current_setting('axven.autor_user_id', true), '')::uuid, auth.uid());
  v_origem := coalesce(
    nullif(current_setting('axven.origem', true), ''),
    case when auth.uid() is not null then 'portal' else 'sistema' end
  );

  insert into public.lead_etapa_eventos (lead_id, cliente_id, etapa_anterior, etapa_nova, valor, motivo, autor_user_id, origem)
  values (
    new.id,
    new.cliente_id,
    case when tg_op = 'UPDATE' then old.etapa end,
    new.etapa,
    case when new.etapa = 'fechado' then new.valor_conversao end,
    case when new.etapa = 'perdido' then new.motivo_perda end,
    v_autor,
    v_origem
  );
  return null;
end;
$$;

drop trigger if exists leads_20_registrar_evento_etapa on public.leads;
create trigger leads_20_registrar_evento_etapa
after insert or update of etapa on public.leads
for each row execute function public.leads_registrar_evento_etapa_trg();

-- 6) RPC usada pelas rotas do servidor (informa origem e autor) ------------------
create or replace function public.atualizar_etapa_lead_v1(
  p_lead_id uuid,
  p_cliente_id uuid,
  p_etapa text,
  p_valor numeric default null,
  p_moeda text default null,
  p_data_conversao timestamptz default null,
  p_motivo text default null,
  p_motivo_detalhe text default null,
  p_origem text default 'axven',
  p_autor_user_id uuid default null
)
returns public.leads
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lead public.leads;
begin
  if p_origem is null or p_origem not in ('portal','axven','sync','sistema') then
    raise exception using message = 'origem_invalida', errcode = '22023';
  end if;

  perform set_config('axven.origem', p_origem, true);
  perform set_config('axven.autor_user_id', coalesce(p_autor_user_id::text, ''), true);

  update public.leads
  set etapa = p_etapa,
      valor_conversao = coalesce(round(p_valor, 2), valor_conversao),
      moeda = coalesce(p_moeda, moeda),
      data_conversao = coalesce(p_data_conversao, data_conversao),
      motivo_perda = coalesce(p_motivo, motivo_perda),
      motivo_perda_detalhe = coalesce(nullif(trim(p_motivo_detalhe), ''), motivo_perda_detalhe),
      atualizado_em = now()
  where id = p_lead_id
    and (p_cliente_id is null or cliente_id = p_cliente_id)
  returning * into v_lead;

  -- Limpa a origem e o autor antes de qualquer retorno ou erro. O teste vem de
  -- v_lead.id, e não de FOUND, porque os `perform` acima alteram o FOUND.
  perform set_config('axven.origem', '', true);
  perform set_config('axven.autor_user_id', '', true);

  if v_lead.id is null then
    raise exception using message = 'lead_nao_encontrado', errcode = 'P0002';
  end if;

  return v_lead;
end;
$$;

revoke all on function public.atualizar_etapa_lead_v1(uuid,uuid,text,numeric,text,timestamptz,text,text,text,uuid) from public, anon, authenticated;
grant execute on function public.atualizar_etapa_lead_v1(uuid,uuid,text,numeric,text,timestamptz,text,text,text,uuid) to service_role;
