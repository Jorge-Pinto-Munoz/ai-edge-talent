\set ON_ERROR_STOP 1
-- Supabase da estos privilegios por defecto; RLS filtra.
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;
insert into role_grants (email, role) values ('admin@kibernum.cl', 'admin');
insert into role_grants (email, role, client_name) values ('sponsor@alfa.cl', 'client', 'Cliente Alfa');
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-00000000000a', 'admin@kibernum.cl'),
 ('00000000-0000-0000-0000-00000000000c', 'sponsor@alfa.cl');
insert into candidates (wave_id, full_name, corporate_email, client_name, status) values
 ('wave-3', 'Ana Kiber', 'ana@kibernum.cl', 'Cliente Alfa', 'APPLICATION_SUBMITTED'),
 ('wave-3', 'Beto Kiber', 'beto@kibernum.cl', 'Cliente Beta', 'APPLICATION_SUBMITTED');
-- Ana crea su usuario después de ser importada: se vincula sola
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000b1', 'ANA@kibernum.cl');
insert into applications (candidate_id, answers) select id, '{"q":"a"}' from candidates;
insert into ai_evaluations (application_id, model, rubric_version, scores, weighted_total, level, recommendation, summary)
  select id, 'claude-opus-5-5', 'R1', '{}', 80, 'A', 'SELECTED', 'ok' from applications;
insert into role_grants (email, role) values ('delivery@kibernum.cl', 'delivery');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000d', 'delivery@kibernum.cl');
select 'profiles', email, role from profiles order by email;
select 'ana vinculada', user_id is not null from candidates where full_name = 'Ana Kiber';

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
select 'KIBER ve candidatos', count(*) from candidates;
select 'KIBER ve evaluaciones IA', count(*) from ai_evaluations;
select 'KIBER ve su postulacion', count(*) from applications;
select 'KIBER vista cliente', count(*) from client_candidate_status;
do $$ begin
  begin update candidates set status = 'SELECTED'; raise notice 'KIBER update filas: %', (select count(*) from candidates where status='SELECTED');
  exception when others then raise notice 'KIBER update bloqueado: %', sqlerrm; end; end $$;

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select 'CLIENTE ve candidatos (tabla)', count(*) from candidates;
select 'CLIENTE ve evaluaciones IA', count(*) from ai_evaluations;
select 'CLIENTE vista', full_name, visible_status from client_candidate_status;

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select 'DELIVERY ve candidatos', count(*) from candidates;
select 'DELIVERY no ve puntajes', count(*) = 0 from ai_evaluations;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select 'ADMIN ve candidatos', count(*) from candidates;
select 'ADMIN ve evaluaciones', count(*) from ai_evaluations;
update candidates set status = 'SELECTED' where full_name = 'Ana Kiber';
insert into decisions (candidate_id, outcome, decided_by) select id, 'SELECTED', '00000000-0000-0000-0000-00000000000a' from candidates where full_name='Ana Kiber';
update decisions set outcome = 'NOT_SELECTED';
select 'decision intacta (RLS sin UPDATE)', outcome = 'SELECTED' from decisions;
reset role;
do $$ begin
  begin update decisions set outcome = 'NOT_SELECTED'; raise notice 'MAL: decision modificada por superusuario';
  exception when others then raise notice 'decisions append-only (trigger) OK'; end; end $$;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  begin insert into decisions (candidate_id, outcome, decided_by) select id, 'SELECTED', '00000000-0000-0000-0000-0000000000b1' from candidates limit 1; raise notice 'MAL: suplantación de decided_by';
  exception when others then raise notice 'decided_by suplantado bloqueado OK'; end; end $$;
reset role;
select 'eventos Ana', from_status, to_status from admission_events e join candidates c on c.id=e.candidate_id where c.full_name='Ana Kiber' order by e.id;

-- Compromiso: versión inmutable y aceptación sin fecha retroactiva
insert into commitment_acceptances (candidate_id, wave_id, document_version, conditions_version)
  select id, 'wave-3', 'CC-1', 'C-1' from candidates where full_name='Ana Kiber';
update commitment_acceptances set status='ACCEPTED', accepted_by='Ana Kiber', accepted_at='2020-01-01';
select 'aceptado hoy (no 2020)', accepted_at::date = current_date from commitment_acceptances;
do $$ begin
  begin update commitment_acceptances set document_version='CC-2'; raise notice 'MAL: version modificada';
  exception when others then raise notice 'version inmutable OK'; end; end $$;
do $$ begin
  begin update commitment_acceptances set status='PENDING'; raise notice 'MAL: aceptado volvió a pendiente';
  exception when others then raise notice 'ACCEPTED solo a SUPERSEDED OK'; end; end $$;
-- Anónimo
set role anon;
do $$ begin
  begin perform count(*) from candidates; raise notice 'MAL: anon lee candidatos';
  exception when others then raise notice 'anon sin acceso OK'; end; end $$;
