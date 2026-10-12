\set ON_ERROR_STOP 1
-- Escenario: Ana (Cliente Alfa) inscrita y en el grupo del mentor; Beto no.
reset role;
update candidates set status = 'ENROLLED', journey_layer = 'ROLE_ENABLEMENT' where full_name = 'Ana Kiber';
update candidates set status = 'ENROLLED', journey_layer = 'AI_MINDSET' where full_name = 'Beto Kiber';
insert into role_grants (email, role) values ('mentor@kibernum.cl', 'mentor');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000e1', 'mentor@kibernum.cl');
insert into wave_groups (id, wave_id, name) values ('10000000-0000-0000-0000-000000000001', 'wave-3', 'Grupo QA');
insert into group_members select '10000000-0000-0000-0000-000000000001', id from candidates where full_name = 'Ana Kiber';
insert into group_mentors values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000e1');
insert into capsules (wave_id, layer, title, published) values ('wave-3', 'AI_MINDSET', 'Cápsula publicada', true), ('wave-3', 'AI_MINDSET', 'Borrador', false);

select id as beto_id from candidates where full_name = 'Beto Kiber' \gset
set role authenticated;
-- Mentor
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select 'MENTOR ve solo su grupo', count(*) = 1 from candidates;
select 'MENTOR no ve evaluaciones', count(*) = 0 from ai_evaluations;
insert into weekly_feedback (group_id, candidate_id, mentor_id, week_start, attendance, progress, risk, comment)
  select '10000000-0000-0000-0000-000000000001', id, '00000000-0000-0000-0000-0000000000e1', date '2026-10-12', 'FULL', 4, 'LOW', 'Avanza bien' from candidates where full_name = 'Ana Kiber';
select 'MENTOR registra feedback de su grupo', count(*) = 1 from weekly_feedback;
do $$ begin
  begin
    insert into weekly_feedback (group_id, candidate_id, mentor_id, week_start, attendance, progress, risk)
      select '10000000-0000-0000-0000-000000000001', c.id, '00000000-0000-0000-0000-0000000000e1', date '2026-10-12', 'NONE', 1, 'HIGH'
      from public.candidates c where c.corporate_email = 'beto@kibernum.cl';
    if found then raise notice 'MAL: mentor escribió feedback fuera de su grupo'; else raise notice 'fuera de grupo invisible OK'; end if;
  exception when others then raise notice 'feedback fuera de grupo bloqueado OK'; end; end $$;
\set ON_ERROR_STOP 0
insert into weekly_feedback (group_id, candidate_id, mentor_id, week_start, attendance, progress, risk)
  values ('10000000-0000-0000-0000-000000000001', :'beto_id', '00000000-0000-0000-0000-0000000000e1', date '2026-10-12', 'NONE', 1, 'HIGH');
\set ON_ERROR_STOP 1
select 'feedback con id ajeno bloqueado', count(*) = 1 from weekly_feedback;
do $$ begin
  begin perform invite_token from public.candidates limit 1; raise notice 'MAL: mentor lee invite_token';
  exception when insufficient_privilege then raise notice 'invite_token protegido OK'; end; end $$;

-- Kiber Ana
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
select 'KIBER ve solo cápsulas publicadas', count(*) = 1 from capsules;
select 'KIBER no ve feedback de mentores', count(*) = 0 from weekly_feedback;
do $$ begin
  begin perform invite_token from public.candidates limit 1; raise notice 'MAL: kiber lee invite_token';
  exception when insufficient_privilege then raise notice 'invite_token protegido para kiber OK'; end; end $$;

-- Cliente Alfa: vista agregada solo de su gente
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select 'CLIENTE vista general', layer, people from client_wave_overview;
select 'CLIENTE solo su cliente', count(*) = 1 from client_candidate_journey;
select 'CLIENTE no ve feedback', count(*) = 0 from weekly_feedback;

-- Admin: movimientos de etapa append-only
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into journey_events (candidate_id, from_layer, to_layer, actor) select id, 'AI_MINDSET', 'ROLE_ENABLEMENT', '00000000-0000-0000-0000-00000000000a' from candidates where full_name = 'Ana Kiber';
select 'ADMIN ve feedback', count(*) = 1 from weekly_feedback;
reset role;
do $$ begin
  begin delete from journey_events; raise notice 'MAL: journey_events borrable';
  exception when others then raise notice 'journey_events append-only OK'; end; end $$;
