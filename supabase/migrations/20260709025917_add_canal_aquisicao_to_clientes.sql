alter table public.clientes
  add column if not exists canal_aquisicao text
  check (canal_aquisicao in ('indicacao','instagram','whatsapp','prospeccao_ativa','site','google','outro'));
