alter table public.clientes
  add column if not exists status_pagamento text
  not null
  default 'em_dia'
  check (status_pagamento in ('em_dia','atrasado','cancelado'));
