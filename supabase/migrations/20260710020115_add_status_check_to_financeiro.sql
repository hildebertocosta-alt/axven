alter table public.financeiro
  add constraint financeiro_status_check
  check (status in ('pendente','pago','em_dia','atrasado','cancelado'));

alter table public.financeiro
  alter column status set default 'pendente';
