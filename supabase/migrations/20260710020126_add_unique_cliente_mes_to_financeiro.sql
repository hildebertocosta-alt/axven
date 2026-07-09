alter table public.financeiro
  add constraint financeiro_cliente_mes_unique unique (cliente_id, mes_referencia);
