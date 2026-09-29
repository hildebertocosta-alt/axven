-- Cliente com IA respondendo no WhatsApp: só nesse caso o CRM mostra "Assumir conversa / Devolver pra IA"
-- (pausado_ia). Padrão: sem IA (Camilo e demais clientes ativos em 29/09/2026 não têm IA no atendimento).
alter table public.clientes
  add column if not exists atendimento_ia boolean not null default false;
