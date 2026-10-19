-- Comunicaciones: copia (CC) y versión HTML de cada correo emitido, para verlo y reenviarlo desde Administración.
-- Baja de inscritos: purge_candidate acepta p_force para eliminar también a quien ya está en el programa
-- (solo Administración, desde el servidor y con confirmación explícita). Re-ejecutable.
alter table public.email_messages add column if not exists cc_emails text[] not null default '{}';
alter table public.email_messages add column if not exists body_html text;
create index if not exists email_messages_created on public.email_messages (created_at desc);

drop function if exists public.purge_candidate(uuid);
create or replace function public.purge_candidate(p_candidate uuid, p_force boolean default false) returns void
language plpgsql security definer set search_path = public as $$
declare s text;
begin
  select status into s from public.candidates where id = p_candidate;
  if s is null then return; end if;
  if not p_force and s in ('CONDITIONS_ACCEPTED', 'ENROLLED', 'MINDSET_READY') then
    raise exception 'No se puede borrar a una persona ya inscrita en el programa.' using errcode = 'P0001';
  end if;
  perform set_config('aet.purge', 'on', true);
  delete from public.candidates where id = p_candidate;
  perform set_config('aet.purge', 'off', true);
end $$;

revoke all on function public.purge_candidate(uuid, boolean) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on function public.purge_candidate(uuid, boolean) from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke all on function public.purge_candidate(uuid, boolean) from authenticated; end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then grant execute on function public.purge_candidate(uuid, boolean) to service_role; end if;
end $$;
