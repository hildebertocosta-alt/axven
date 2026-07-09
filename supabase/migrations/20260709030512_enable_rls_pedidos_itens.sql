alter table public.pedidos_itens enable row level security;
create policy "permitir leitura publica" on public.pedidos_itens for select using (true);
