-- Control de accesos: roles internos solo por Administración, cuenta principal y última cuenta admin protegidas.
\set ON_ERROR_STOP 1
reset role;
-- Alguien crea un usuario de Auth por otra vía con un correo pre-autorizado como Delivery / Hub.
insert into role_grants (email, role) values ('intruso.delivery@kibernum.cl', 'delivery'), ('intruso.hub@kibernum.cl', 'hub') on conflict do nothing;
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-00000000a0c1', 'intruso.delivery@kibernum.cl'),
 ('00000000-0000-0000-0000-00000000a0c2', 'intruso.hub@kibernum.cl'),
 ('00000000-0000-0000-0000-00000000a0c3', 'comun@correo.cl');
select 'rol interno nace PENDIENTE', status = 'PENDING' from profiles where id = '00000000-0000-0000-0000-00000000a0c1';
select 'profesional nace ACTIVO', status = 'ACTIVE' and role = 'kiber' from profiles where id = '00000000-0000-0000-0000-00000000a0c3';

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a0c1';
select 'delivery pendiente sin permisos de staff', not public.is_staff();
select 'delivery pendiente no ve candidatos', count(*) = 0 from candidates;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a0c2';
select 'hub pendiente sin rol vigente', public.current_role() is null;

-- Un usuario común intenta darse un rol interno por la API.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a0c3';
update profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000a0c3';
do $$ begin
  begin insert into role_grants (email, role) values ('comun@correo.cl', 'admin'); raise notice 'MAL: usuario común escribió role_grants';
  exception when others then null; end;
end $$;
reset role;
select 'usuario común sigue siendo profesional', role = 'kiber' from profiles where id = '00000000-0000-0000-0000-00000000a0c3';
select 'sin role_grants admin para el usuario común', not exists (select 1 from role_grants where email = 'comun@correo.cl');

-- Solicitudes públicas: no pueden pedir roles internos.
do $$ begin
  begin insert into access_requests (kind, reason, requested_role, name, email, description) values ('ACCOUNT', 'CUENTA', 'delivery', 'Xavier Prueba', 'x@correo.cl', '');
    raise notice 'MAL: solicitud con rol interno aceptada';
  exception when check_violation then null; end;
end $$;
insert into access_requests (kind, reason, requested_role, name, email, description) values ('ACCOUNT', 'CUENTA', 'kiber', 'Yolanda Prueba', 'y@correo.cl', '');
select 'solicitud como profesional aceptada', count(*) = 1 from access_requests where email = 'y@correo.cl';

-- Cuenta principal (creada por el seed): existe una sola vez y está protegida.
select 'cuenta principal única', count(*) = 1 from profiles where principal;
select 'principal es admin', role = 'admin' from profiles where principal;
update profiles set status = 'ACTIVE' where principal;
do $$ begin
  begin update profiles set role = 'delivery' where principal; raise notice 'MAL: principal degradada';
  exception when raise_exception then null; end;
  begin update profiles set status = 'PAUSED' where principal; raise notice 'MAL: principal pausada';
  exception when raise_exception then null; end;
  begin delete from profiles where principal; raise notice 'MAL: principal eliminada';
  exception when raise_exception then null; end;
  begin update profiles set principal = false where principal; raise notice 'MAL: principal desmarcada';
  exception when raise_exception then null; end;
end $$;
select 'principal intacta', role = 'admin' and status = 'ACTIVE' and principal from profiles where principal;

-- Un admin con sesión no puede marcarse principal.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  begin update profiles set principal = true where id = '00000000-0000-0000-0000-00000000000a';
    if (select principal from profiles where id = '00000000-0000-0000-0000-00000000000a') then raise notice 'MAL: admin se marcó principal'; end if;
  exception when insufficient_privilege or unique_violation then null; end;
end $$;
reset role;

-- Última cuenta admin activa: sin la principal activa, no se puede quitar el último admin.
update profiles set status = 'PENDING' where principal;
do $$ begin
  begin update profiles set status = 'PAUSED' where role = 'admin' and status = 'ACTIVE' and not principal;
    raise notice 'MAL: quedaron cero admin activos';
  exception when raise_exception then null; end;
end $$;
select 'queda al menos un admin activo', count(*) >= 1 from profiles where role = 'admin' and status = 'ACTIVE';

-- Borrar postulación: solo con purge_candidate (servidor), nunca un DELETE directo ni un usuario con sesión.
reset role;
insert into candidates (wave_id, full_name, corporate_email, status) values ('wave-3', 'Borrar Prueba', 'borrar@correo.cl', 'IDENTIFIED');
update candidates set status = 'APPLICATION_STARTED' where corporate_email = 'borrar@correo.cl';
insert into applications (candidate_id, answers) select id, '{"q":"x"}' from candidates where corporate_email = 'borrar@correo.cl';
do $$ begin
  begin delete from admission_events where candidate_id = (select id from candidates where corporate_email = 'borrar@correo.cl');
    raise notice 'MAL: historial borrado sin purge';
  exception when raise_exception then null; end;
end $$;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  begin perform public.purge_candidate((select id from candidates where corporate_email = 'borrar@correo.cl'));
    raise notice 'MAL: un usuario con sesión ejecutó purge_candidate';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select public.purge_candidate(id) from candidates where corporate_email = 'borrar@correo.cl';
select 'postulación borrada con su historial', not exists (select 1 from candidates where corporate_email = 'borrar@correo.cl');
do $$ begin
  begin delete from admission_events where id = (select min(id) from admission_events);
    raise notice 'MAL: append-only desactivado después del purge';
  exception when raise_exception then null; end;
end $$;
do $$ declare c uuid; begin
  select id into c from candidates where status in ('CONDITIONS_ACCEPTED','ENROLLED','MINDSET_READY') limit 1;
  if c is null then return; end if;
  begin perform public.purge_candidate(c); raise notice 'MAL: se borró una persona inscrita';
  exception when raise_exception then null; end;
end $$;
-- Baja de un inscrito: solo con confirmación explícita (p_force) desde el servidor.
do $$ declare c uuid; begin
  select id into c from candidates where status in ('CONDITIONS_ACCEPTED','ENROLLED','MINDSET_READY') limit 1;
  if c is null then return; end if;
  perform public.purge_candidate(c, true);
  if exists (select 1 from candidates where id = c) then raise notice 'MAL: la baja forzada no eliminó al inscrito'; end if;
end $$;
