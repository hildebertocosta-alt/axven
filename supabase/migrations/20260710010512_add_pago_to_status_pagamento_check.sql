alter table public.clientes drop constraint clientes_status_pagamento_check;
alter table public.clientes add constraint clientes_status_pagamento_check
  check (status_pagamento in ('pago','em_dia','atrasado','cancelado'));
