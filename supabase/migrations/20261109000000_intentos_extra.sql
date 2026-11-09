-- AET Platform · Intentos del desafío: 3 por defecto en AI First Mindset e intentos extra por persona. Re-ejecutable.

-- Intento extra concedido por el admin a una persona en un módulo (excepción registrada; suma al máximo del módulo).
create table if not exists public.attempt_grants (
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  capsule_id uuid not null references public.capsules (id) on delete cascade,
  extra smallint not null default 1 check (extra between 1 and 5),
  note text check (char_length(note) <= 500),
  granted_by uuid references auth.users (id),
  updated_at timestamptz not null default now(),
  primary key (candidate_id, capsule_id)
);
alter table public.attempt_grants enable row level security;
-- Lectura: admin, el propio profesional y su Delivery. Escritura solo desde el servidor (acción de admin).
drop policy if exists attempt_grants_read on public.attempt_grants;
create policy attempt_grants_read on public.attempt_grants for select using (
  public.is_admin() or candidate_id in (select public.my_candidate_ids()) or public.is_delivery_of(candidate_id)
);

-- Una sola vez: los desafíos de AI First Mindset con 2 intentos pasan a 3. Si después el admin vuelve a poner 2,
-- esta migración no lo pisa al re-ejecutarse (marca en app_settings).
do $$
begin
  if not exists (select 1 from public.app_settings where key = 'migracion_mindset_3_intentos') then
    update public.capsules set max_attempts = 3 where layer = 'AI_MINDSET' and max_attempts = 2;
    insert into public.app_settings (key, value) values ('migracion_mindset_3_intentos', to_jsonb(now()));
  end if;
end $$;
