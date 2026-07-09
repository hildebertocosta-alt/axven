create table if not exists public.despesas (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  categoria text,
  valor numeric not null,
  mes_referencia text not null,
  data date,
  criado_em timestamp with time zone default now()
);

alter table public.despesas enable row level security;
create policy "permitir leitura publica" on public.despesas for select using (true);
