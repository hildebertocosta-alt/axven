-- Painel Axven · Entrega 1: converte as etapas antigas dos leads de clientes para o funil novo
-- e cria a linha de base do histórico (evento de entrada de cada lead que já existia).
-- Os gatilhos de 20260929180000 registram cada conversão com origem 'sistema'.

update public.leads
set etapa = 'oportunidade'
where etapa in ('agendado', 'proposta_enviada');

update public.leads
set etapa = 'perdido',
    motivo_perda = 'outro',
    motivo_perda_detalhe = 'Migrado da etapa antiga "não fechou"'
where etapa = 'nao_fechou';

update public.leads
set etapa = 'perdido',
    motivo_perda = 'fora_do_perfil',
    motivo_perda_detalhe = 'Migrado da etapa antiga "desqualificado"'
where etapa = 'desqualificado';

insert into public.lead_etapa_eventos (lead_id, cliente_id, etapa_anterior, etapa_nova, origem, criado_em)
select l.id, l.cliente_id, null, 'lead', 'sistema', coalesce(l.criado_em, now())
from public.leads l
where not exists (
  select 1 from public.lead_etapa_eventos e where e.lead_id = l.id and e.etapa_anterior is null
);
