create extension if not exists pgcrypto;

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  nicho text,
  status text check (status in ('ativo','alerta','atencao','critico','verificar')),
  score integer,
  ctr_trend numeric,
  budget_status text,
  ultima_revisao date,
  proxima_revisao date,
  honorarios numeric,
  dia_pagamento integer,
  criado_em timestamp without time zone default now()
);

create table if not exists public.campanhas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  nome text not null,
  objetivo text,
  orcamento_diario numeric,
  conjuntos integer,
  data_inicio date,
  data_analise date,
  status text,
  observacoes text,
  criado_em timestamp without time zone default now()
);

create table if not exists public.alertas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  tipo text check (tipo in ('critico','alerta','info','sucesso')),
  mensagem text not null,
  resolvido boolean default false,
  criado_em timestamp without time zone default now()
);

create table if not exists public.lembretes (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  concluido boolean default false,
  criado_em timestamp without time zone default now()
);

create table if not exists public.financeiro (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  valor numeric not null,
  dia_vencimento integer,
  status text check (status in ('pago','pendente','atrasado')),
  mes_referencia text,
  criado_em timestamp without time zone default now()
);

insert into public.clientes (
  id,
  nome,
  nicho,
  status,
  score,
  ctr_trend,
  budget_status,
  ultima_revisao,
  proxima_revisao,
  honorarios,
  dia_pagamento,
  criado_em
) values
  ('0f2ff0d0-9e43-4c78-b4c8-b2de490d39bc', 'Face e Corpo', 'Clínica Estética', 'verificar', null, null, null, null, null, 1000, 1, now()),
  ('d3db4e6d-3756-4e72-8f9f-256e9256e9e2', 'Dra. Gabriela Brito', 'Clínica Estética', 'alerta', 71, null, null, null, null, 500, 15, now()),
  ('1f3d9eb7-805c-4c55-ae68-71fd7d33b6db', 'Edson Da Hora', 'Quality Lead', 'atencao', 86, null, null, null, null, 500, 5, now()),
  ('a5b1e96f-3f40-4f7d-b511-79b9e07a7e3c', 'Marquinhos Estilos', 'Moda Masculina', 'critico', 95, null, null, null, null, 600, 3, now()),
  ('4d8ee3fb-8f41-4f7c-83ee-a6aea61f0c39', 'Ejetec', 'Soldagem Industrial', 'verificar', 100, null, null, null, null, 2250, 12, now()),
  ('be2d9dcf-b7e7-4700-a8d3-6fc7f6617234', 'Tritão Náutica', 'Náutica', 'verificar', 100, null, null, null, null, 800, 5, now()),
  ('9f3c95a8-29eb-4ced-a4f8-16be0c2f3e25', 'Rei da Parmegiana', 'Restaurante', 'verificar', 100, null, null, null, null, 500, 14, now()),
  ('f2240f0b-43f2-4c0e-9f82-0314a35bf4db', 'Beatriz Lima Nutri', 'Nutrição', 'verificar', 100, null, null, null, null, 500, 12, now());
