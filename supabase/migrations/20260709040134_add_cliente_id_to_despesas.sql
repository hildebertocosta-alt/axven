alter table public.despesas
  add column if not exists cliente_id uuid references public.clientes(id) on delete set null;
