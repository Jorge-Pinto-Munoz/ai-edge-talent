-- Borrar una postulación para que la persona pueda postular desde cero (re-ejecutable).
-- El historial de admisión es append-only (decisiones, eventos, confirmaciones, compromisos, journey): ningún
-- usuario puede borrarlo. La única excepción es purge_candidate(), que ejecuta solo el servidor (llave de
-- servicio) tras verificar que quien lo pide es admin, y deja registro en audit_log. No borra personas ya
-- inscritas en el programa (compromiso aceptado o journey en curso).

create or replace function public.forbid_mutation() returns trigger language plpgsql as $$
begin
  -- Solo dentro de purge_candidate (variable de transacción) se permite el DELETE en cascada.
  if tg_op = 'DELETE' and current_setting('aet.purge', true) = 'on' then return old; end if;
  raise exception 'Tabla append-only: % no permite %', tg_table_name, tg_op;
end $$;

create or replace function public.purge_candidate(p_candidate uuid) returns void
language plpgsql security definer set search_path = public as $$
declare s text;
begin
  select status into s from public.candidates where id = p_candidate;
  if s is null then return; end if;
  if s in ('CONDITIONS_ACCEPTED', 'ENROLLED', 'MINDSET_READY') then
    raise exception 'No se puede borrar a una persona ya inscrita en el programa.' using errcode = 'P0001';
  end if;
  perform set_config('aet.purge', 'on', true);
  delete from public.candidates where id = p_candidate;
  perform set_config('aet.purge', 'off', true);
end $$;

revoke all on function public.purge_candidate(uuid) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on function public.purge_candidate(uuid) from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke all on function public.purge_candidate(uuid) from authenticated; end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then grant execute on function public.purge_candidate(uuid) to service_role; end if;
end $$;
