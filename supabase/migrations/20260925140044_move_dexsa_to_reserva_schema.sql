-- Projeto "dexsa" (oficina) não concluído: sai do schema public da Axven e fica em reserva, fora da API.
create schema if not exists reserva;
revoke all on schema reserva from anon, authenticated;
alter table public.dexsa_clientes set schema reserva;
alter table public.dexsa_veiculos set schema reserva;
alter table public.dexsa_revisoes set schema reserva;
alter table public.dexsa_itens_revisao set schema reserva;
alter table public.dexsa_pneus_revisao set schema reserva;
alter table public.dexsa_marcas_oleo set schema reserva;
alter table public.dexsa_mecanicos set schema reserva;
alter function public.dexsa_recalc_valor_total() set schema reserva;
