-- Rodar dentro de begin; … rollback; (depois da migração 20260930120000).
do $$
declare v_cliente uuid; v_user uuid := '00000000-0000-4000-8000-00000000b001'; v_ok boolean;
begin
  select id into v_cliente from public.clientes where slug = 'camilo-imoveis';
  if (select capi_origem from public.clientes where id = v_cliente) <> 'axven' then raise exception 'E1 FALHOU: Camilo não está com capi_origem axven'; end if;

  insert into auth.users (id, email, aud, role) values (v_user, 'teste-e3@axven.invalid', 'authenticated', 'authenticated');
  insert into public.crm_usuarios (user_id, cliente_id, nome, whatsapp, recebe_lembrete) values (v_user, v_cliente, 'Teste', '5581900000000', true);
  insert into public.notificacoes_whatsapp (usuario_id, cliente_id, tipo, data_ref, telefone, mensagem) values (v_user, v_cliente, 'lembrete_parados', '2026-09-30', '5581900000000', 'x');
  v_ok := false;
  begin
    insert into public.notificacoes_whatsapp (usuario_id, cliente_id, tipo, data_ref, telefone, mensagem) values (v_user, v_cliente, 'lembrete_parados', '2026-09-30', '5581900000000', 'y');
  exception when unique_violation then v_ok := true;
  end;
  if not v_ok then raise exception 'E2 FALHOU: dois lembretes no mesmo dia'; end if;
end $$;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000b001","role":"authenticated"}', true);
set local role authenticated;
do $$
declare v_n int; v_ok boolean := false;
begin
  begin
    select count(*) into v_n from public.cliente_segredos;
  exception when insufficient_privilege then v_ok := true;
  end;
  if not v_ok then raise exception 'E3 FALHOU: usuário do portal consegue ler cliente_segredos'; end if;
  v_ok := false;
  begin
    select count(*) into v_n from public.notificacoes_whatsapp;
  exception when insufficient_privilege then v_ok := true;
  end;
  if not v_ok then raise exception 'E4 FALHOU: usuário do portal consegue ler notificacoes_whatsapp'; end if;
end $$;
reset role;
select 'TODOS OS TESTES PASSARAM' as resultado;
