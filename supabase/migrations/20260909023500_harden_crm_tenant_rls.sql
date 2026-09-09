-- Axven CRM clientes — hardening de isolamento multi-tenant
-- Escopo V1: tabelas usadas pelo portal CRM + correção das duas tabelas públicas sem RLS.

alter table public.documentos enable row level security;
alter table public.capi_eventos enable row level security;

-- Políticas explícitas para usuários autenticados do CRM.
-- Removemos as versões antigas atribuídas a PUBLIC e recriamos com escopo authenticated.

drop policy if exists "funcionario ve so o proprio vinculo" on public.crm_usuarios;
create policy "crm_usuario_ve_so_proprio_vinculo"
on public.crm_usuarios
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "funcionario ve so o proprio cliente" on public.clientes;
create policy "crm_usuario_ve_so_proprio_cliente"
on public.clientes
for select
to authenticated
using (
  id in (
    select cu.cliente_id
    from public.crm_usuarios cu
    where cu.user_id = (select auth.uid())
  )
);

drop policy if exists "funcionario ve so leads do seu cliente" on public.leads;
create policy "crm_usuario_ve_leads_do_proprio_cliente"
on public.leads
for select
to authenticated
using (
  cliente_id in (
    select cu.cliente_id
    from public.crm_usuarios cu
    where cu.user_id = (select auth.uid())
  )
);

drop policy if exists "funcionario insere leads do seu cliente" on public.leads;
create policy "crm_usuario_insere_leads_do_proprio_cliente"
on public.leads
for insert
to authenticated
with check (
  cliente_id in (
    select cu.cliente_id
    from public.crm_usuarios cu
    where cu.user_id = (select auth.uid())
  )
);

drop policy if exists "funcionario atualiza so leads do seu cliente" on public.leads;
create policy "crm_usuario_atualiza_leads_do_proprio_cliente"
on public.leads
for update
to authenticated
using (
  cliente_id in (
    select cu.cliente_id
    from public.crm_usuarios cu
    where cu.user_id = (select auth.uid())
  )
)
with check (
  cliente_id in (
    select cu.cliente_id
    from public.crm_usuarios cu
    where cu.user_id = (select auth.uid())
  )
);

drop policy if exists "funcionario ve so mensagens do seu cliente" on public.leads_mensagens;
create policy "crm_usuario_ve_mensagens_do_proprio_cliente"
on public.leads_mensagens
for select
to authenticated
using (
  lead_id in (
    select l.id
    from public.leads l
    where l.cliente_id in (
      select cu.cliente_id
      from public.crm_usuarios cu
      where cu.user_id = (select auth.uid())
    )
  )
);

drop policy if exists "funcionario insere mensagens do seu cliente" on public.leads_mensagens;
create policy "crm_usuario_insere_mensagens_do_proprio_cliente"
on public.leads_mensagens
for insert
to authenticated
with check (
  lead_id in (
    select l.id
    from public.leads l
    where l.cliente_id in (
      select cu.cliente_id
      from public.crm_usuarios cu
      where cu.user_id = (select auth.uid())
    )
  )
);

drop policy if exists "funcionario ve so disparos do seu cliente" on public.disparos;
create policy "crm_usuario_ve_disparos_do_proprio_cliente"
on public.disparos
for select
to authenticated
using (
  cliente_id in (
    select cu.cliente_id
    from public.crm_usuarios cu
    where cu.user_id = (select auth.uid())
  )
);

drop policy if exists "funcionario ve so itens de disparo do seu cliente" on public.disparos_itens;
create policy "crm_usuario_ve_itens_disparo_do_proprio_cliente"
on public.disparos_itens
for select
to authenticated
using (
  disparo_id in (
    select d.id
    from public.disparos d
    where d.cliente_id in (
      select cu.cliente_id
      from public.crm_usuarios cu
      where cu.user_id = (select auth.uid())
    )
  )
);

-- Documentos podem ser expostos futuramente no Cliente 360, mas apenas ao tenant dono.
create policy "crm_usuario_ve_documentos_do_proprio_cliente"
on public.documentos
for select
to authenticated
using (
  cliente_id in (
    select cu.cliente_id
    from public.crm_usuarios cu
    where cu.user_id = (select auth.uid())
  )
);

-- capi_eventos permanece sem policy para anon/authenticated nesta etapa.
-- O acesso operacional continua restrito ao backend privilegiado (service role).
