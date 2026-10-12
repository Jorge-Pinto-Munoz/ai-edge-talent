\set ON_ERROR_STOP 1
reset role;
select 'talento enlazado a candidatos', count(*) = 0 from candidates where talent_id is null;
select 'cluster QA', specialty_family('QA Analyst') = 'Calidad', specialty_family('Scrum Master') = 'Agilidad', specialty_family('Backend Developer') = 'Ingeniería', specialty_family('Data Analyst') = 'Datos';
-- nuevo candidato en otra Wave con el mismo correo → misma ficha
insert into candidates (wave_id, full_name, corporate_email, status, source) values ('wave-1', 'Ana Kiber', 'ANA@kibernum.cl', 'ENROLLED', 'historical');
select 'una ficha por persona entre Waves', count(distinct talent_id) = 1 from candidates where lower(corporate_email) = 'ana@kibernum.cl';

set role authenticated;
-- Delivery: lee y actualiza estado de servicio; no puede marcar high talent
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select 'DELIVERY ve talento', count(*) > 0 from talent;
update talent set service_status = 'LEFT', service_status_since = date '2026-10-01', left_reason = 'Cambio de empresa' where email = 'beto@kibernum.cl';
do $$ begin
  begin update public.talent set high_talent = true where email = 'ana@kibernum.cl'; raise notice 'MAL: delivery marcó high talent';
  exception when others then raise notice 'high talent solo admin OK'; end; end $$;
-- Admin: marca high talent
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
update talent set high_talent = true, high_talent_reason = 'Caso de éxito temprano' where email = 'ana@kibernum.cl';
select 'ADMIN marcó high talent', high_talent from talent where email = 'ana@kibernum.cl';
-- Cliente, Kiber y mentor: sin acceso
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select 'CLIENTE no ve talento', count(*) = 0 from talent;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
select 'KIBER no ve talento', count(*) = 0 from talent;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select 'MENTOR no ve talento', count(*) = 0 from talent;
reset role;
select 'historial de servicio registrado', to_status = 'LEFT' from service_status_history order by id desc limit 1;
do $$ begin
  begin delete from service_status_history; raise notice 'MAL: historial borrable';
  exception when others then raise notice 'historial de servicio append-only OK'; end; end $$;
