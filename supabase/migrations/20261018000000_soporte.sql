-- AET Platform · Canal de soporte: preguntas que no resuelve el FAQ. Re-ejecutable.
-- La escritura la hace el servidor (valida y limita); la lectura y gestión, solo admin.
create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (email = lower(email) and char_length(email) <= 200),
  audience text not null default 'profesional' check (audience in ('profesional', 'cliente', 'equipo', 'otro')),
  topic text not null check (char_length(topic) <= 80),
  message text not null check (char_length(message) between 10 and 4000),
  page text,
  user_id uuid references auth.users (id) on delete set null,
  status text not null default 'OPEN' check (status in ('OPEN', 'RESOLVED')),
  email_status text not null default 'PENDING' check (email_status in ('PENDING', 'SENT', 'FAILED')),
  email_error text,
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id)
);
create index if not exists support_requests_open on public.support_requests (status, created_at desc);
create index if not exists support_requests_email on public.support_requests (email, created_at desc);

alter table public.support_requests enable row level security;
drop policy if exists support_admin_read on public.support_requests;
create policy support_admin_read on public.support_requests for select using (public.is_admin());
drop policy if exists support_admin_update on public.support_requests;
create policy support_admin_update on public.support_requests for update using (public.is_admin()) with check (public.is_admin());
