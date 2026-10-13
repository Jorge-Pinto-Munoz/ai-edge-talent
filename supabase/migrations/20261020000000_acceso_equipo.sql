-- AET Platform · Acceso del equipo (Delivery y admin) con código numérico por correo, y auditoría de ingresos. Re-ejecutable.
--  * staff_login_codes: códigos de 4 dígitos (solo su hash), con expiración, intentos y control de reenvío. Solo el servidor los usa.
--  * access_sessions / access_events: quién ingresó, cuándo, cuánto duró y qué secciones del área de equipo consultó.
--    Solo el admin los lee. Se conservan 180 días (purge_access_logs).

create table if not exists public.staff_login_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email)),
  code_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  attempts smallint not null default 0,
  consumed_at timestamptz
);
create index if not exists staff_login_codes_email on public.staff_login_codes (email, created_at desc);
alter table public.staff_login_codes enable row level security;
-- Sin políticas: nadie la lee ni escribe con su sesión; solo el servidor con la llave de servicio.

create table if not exists public.access_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  role text not null,
  method text not null default 'LINK' check (method in ('CODE', 'LINK')),
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  user_agent text check (char_length(user_agent) <= 300)
);
create index if not exists access_sessions_user on public.access_sessions (user_id, last_seen_at desc);
create index if not exists access_sessions_started on public.access_sessions (started_at desc);

create table if not exists public.access_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.access_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  path text not null check (char_length(path) <= 200),
  at timestamptz not null default now()
);
create index if not exists access_events_session on public.access_events (session_id, at);

alter table public.access_sessions enable row level security;
alter table public.access_events enable row level security;
drop policy if exists access_sessions_admin on public.access_sessions;
create policy access_sessions_admin on public.access_sessions for select using (public.is_admin());
drop policy if exists access_events_admin on public.access_events;
create policy access_events_admin on public.access_events for select using (public.is_admin());

-- Retención: 180 días para ingresos y secciones; 1 día para códigos.
create or replace function public.purge_access_logs() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Solo admin';
  end if;
  delete from public.access_sessions where started_at < now() - interval '180 days';
  delete from public.staff_login_codes where created_at < now() - interval '1 day';
end $$;
revoke all on function public.purge_access_logs() from public;
grant execute on function public.purge_access_logs() to authenticated, service_role;
