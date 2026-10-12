\set ON_ERROR_STOP 1
reset role;
-- Profesor de wave-3, líder Hub de wave-3 y un profesor de otra Wave
insert into role_grants (email, role) values ('profe@kibernum.cl', 'profesor'), ('hub@kibernum.cl', 'hub'), ('otro.profe@kibernum.cl', 'profesor') on conflict do nothing;
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-0000000000f1', 'profe@kibernum.cl'),
 ('00000000-0000-0000-0000-0000000000f2', 'hub@kibernum.cl'),
 ('00000000-0000-0000-0000-0000000000f3', 'otro.profe@kibernum.cl');
insert into wave_staff (wave_id, email, role) values ('wave-3', 'profe@kibernum.cl', 'profesor'), ('wave-3', 'hub@kibernum.cl', 'hub'), ('wave-1', 'otro.profe@kibernum.cl', 'profesor');
select 'perfiles con rol nuevo', count(*) = 3 from profiles where role in ('profesor', 'hub');

set role authenticated;
-- Profesor: ve participantes de su Wave y registra su clase con asistencia
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
select 'PROFESOR ve su Wave', count(*) > 0 from candidates where wave_id = 'wave-3';
select 'PROFESOR no ve otras Waves', count(*) = 0 from candidates where wave_id <> 'wave-3';
insert into teacher_classes (wave_id, held_on, objective, topic) values ('wave-3', date '2026-10-14', 'Prompting para pruebas', 'Casos de prueba con IA');
insert into teacher_class_attendance (class_id, candidate_id, attended)
  select t.id, c.id, false from teacher_classes t, candidates c where c.full_name = 'Ana Kiber' limit 1;
select 'PROFESOR registró asistencia', count(*) = 1 from teacher_class_attendance;
do $$ begin
  begin insert into teacher_class_attendance (class_id, candidate_id, attended)
    select t.id, c.id, true from teacher_classes t, candidates c where c.wave_id <> 'wave-3' limit 1;
    if found then raise notice 'MAL: asistencia de otra Wave'; end if;
  exception when others then raise notice 'asistencia solo de su Wave OK'; end; end $$;
-- Otro profesor (otra Wave): no puede escribir en wave-3 ni leer clases ajenas
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f3';
do $$ begin
  begin insert into teacher_classes (wave_id, held_on) values ('wave-3', date '2026-10-14'); raise notice 'MAL: profesor escribió en Wave ajena';
  exception when others then raise notice 'profesor solo en su Wave OK'; end; end $$;
select 'OTRO PROFESOR no lee clases ajenas', count(*) = 0 from teacher_classes;
-- Delivery lee clases y asistencia
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select 'DELIVERY ve inasistencias', count(*) = 1 from teacher_class_attendance where not attended;
-- Kiber y cliente no ven el registro del profesor
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
select 'KIBER no ve asistencia', count(*) = 0 from teacher_class_attendance;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select 'CLIENTE no ve clases del profesor', count(*) = 0 from teacher_classes;

-- Hub: clases, proyectos e integrantes
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f2';
insert into lab_sessions (wave_id, n, held_on, notes) values ('wave-3', 1, date '2026-11-02', 'Llegaron con sus ideas');
insert into lab_projects (wave_id, title, mode) values ('wave-3', 'Agente de casos de prueba', 'GROUP');
insert into lab_project_members (project_id, candidate_id) select p.id, c.id from lab_projects p, candidates c where c.full_name = 'Ana Kiber';
insert into lab_session_entries (session_id, project_id, attended, note) select s.id, p.id, true, 'Trajo la idea validada' from lab_sessions s, lab_projects p;
select 'HUB registró clase y proyecto', count(*) = 1 from lab_session_entries;
-- El Kiber integrante ve su proyecto, pero no las notas de clase del Hub
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
select 'KIBER ve su proyecto', count(*) = 1 from lab_projects;
select 'KIBER no ve notas de clase', count(*) = 0 from lab_session_entries;
do $$ begin
  begin update public.lab_projects set status = 'PRESENTED'; raise notice 'KIBER update lab: % filas', (select count(*) from public.lab_projects where status = 'PRESENTED');
  exception when others then raise notice 'KIBER no modifica proyectos OK'; end; end $$;
select 'KIBER no cambió el estado', count(*) = 0 from lab_projects where status = 'PRESENTED';
-- Profesor no ve el Lab
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
select 'PROFESOR no ve el Lab', count(*) = 0 from lab_projects;
-- Cliente no ve el Lab
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select 'CLIENTE no ve el Lab', count(*) = 0 from lab_projects;
reset role;
