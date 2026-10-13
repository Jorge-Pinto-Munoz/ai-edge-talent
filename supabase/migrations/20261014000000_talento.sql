-- AET Platform · Fase 3: Talento y alumni
-- Una ficha de talento por persona (por correo) que atraviesa todas sus Waves:
-- estado de servicio (sigue en servicio / banca / salió) con historial, high talent,
-- clusters por especialidad y seguimiento post-habilitación (Mes 1 adopción, Mes 3 impacto).
-- Re-ejecutable: se puede correr de nuevo sin error.

do $t$ begin
  create type public.service_status as enum ('IN_SERVICE', 'BENCH', 'LEFT');
exception when duplicate_object then null;
end $t$;

create table if not exists public.talent (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  full_name text not null,
  specialty text,                       -- texto libre (de la importación o editado)
  specialty_family text,                -- cluster normalizado: Ingeniería, Calidad, Agilidad, Datos, Otro
  current_client text,
  role_title text,
  service_status public.service_status not null default 'IN_SERVICE',
  service_status_since date,
  left_reason text,
  high_talent boolean not null default false,
  high_talent_reason text,
  high_talent_by uuid references auth.users (id),
  high_talent_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.candidates add column if not exists talent_id uuid references public.talent (id);
create index if not exists candidates_talent on public.candidates (talent_id);

-- Waves históricas: se pueden cargar participantes de Waves pasadas.
alter table public.candidates drop constraint if exists candidates_source_check;
alter table public.candidates add constraint candidates_source_check check (source in ('import', 'nomination', 'self', 'historical', 'manual', 'special', 'demo'));

-- Familia de especialidad (misma regla que lib/talent/rules.ts).
create or replace function public.specialty_family(p text) returns text
language sql immutable as $fn$
  select case
    when p is null or btrim(p) = '' then null
    when lower(p) ~ '(qa|calidad|test|quality)' then 'Calidad'
    when lower(p) ~ '(scrum|agil|ágil|agile|po\b|product owner|project|pm\b|gestión|gestion)' then 'Agilidad'
    when lower(p) ~ '(dato|data|bi\b|analytics|analista de datos|cient)' then 'Datos'
    when lower(p) ~ '(dev|desarroll|ingenier|engineer|backend|frontend|fullstack|full stack|software|arquitect|devops|cloud|mobile)' then 'Ingeniería'
    else 'Otro'
  end
$fn$;

-- Cada candidato queda enlazado a su ficha de talento (se crea si no existe).
create or replace function public.link_talent() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare tid uuid;
begin
  insert into public.talent (email, full_name, specialty, specialty_family, current_client, role_title)
  values (lower(new.corporate_email), new.full_name, new.specialty,
          public.specialty_family(coalesce(new.specialty, new.role_title)), new.client_name, new.role_title)
  on conflict (email) do update set
    specialty = coalesce(public.talent.specialty, excluded.specialty),
    specialty_family = coalesce(public.talent.specialty_family, excluded.specialty_family),
    current_client = coalesce(excluded.current_client, public.talent.current_client),
    role_title = coalesce(excluded.role_title, public.talent.role_title)
  returning id into tid;
  new.talent_id := tid;
  return new;
end $fn$;

drop trigger if exists candidates_link_talent on public.candidates;
create trigger candidates_link_talent before insert on public.candidates
  for each row when (new.talent_id is null) execute function public.link_talent();

-- Enlazar candidatos que ya existían.
do $t$
declare r record; tid uuid;
begin
  for r in select * from public.candidates where talent_id is null loop
    insert into public.talent (email, full_name, specialty, specialty_family, current_client, role_title)
    values (lower(r.corporate_email), r.full_name, r.specialty, public.specialty_family(coalesce(r.specialty, r.role_title)), r.client_name, r.role_title)
    on conflict (email) do update set full_name = public.talent.full_name
    returning id into tid;
    update public.candidates set talent_id = tid where id = r.id;
  end loop;
end $t$;

-- Historial de estado de servicio (append-only).
create table if not exists public.service_status_history (
  id bigint generated always as identity primary key,
  talent_id uuid not null references public.talent (id) on delete cascade,
  from_status public.service_status,
  to_status public.service_status not null,
  effective_date date,
  note text,
  actor uuid references auth.users (id),
  at timestamptz not null default now()
);
drop trigger if exists service_history_append_only on public.service_status_history;
create trigger service_history_append_only before update or delete on public.service_status_history
  for each row execute function public.forbid_mutation();

create or replace function public.log_service_status() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  if new.service_status is distinct from old.service_status then
    insert into public.service_status_history (talent_id, from_status, to_status, effective_date, note, actor)
    values (new.id, old.service_status, new.service_status, new.service_status_since, new.left_reason, auth.uid());
  end if;
  -- Solo admin marca o desmarca high talent.
  if new.high_talent is distinct from old.high_talent and auth.uid() is not null and not public.is_admin() then
    raise exception 'Solo un admin puede marcar High Talent';
  end if;
  new.updated_at := now();
  return new;
end $fn$;
drop trigger if exists talent_status_log on public.talent;
create trigger talent_status_log before update on public.talent
  for each row execute function public.log_service_status();

-- Seguimiento post-habilitación: Mes 1 (percepción y adopción) y Mes 3 (impacto real).
create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  talent_id uuid not null references public.talent (id) on delete cascade,
  wave_id text references public.waves (id),
  kind text not null check (kind in ('MONTH_1', 'MONTH_3', 'CUSTOM')),
  due_date date not null,
  done_at timestamptz,
  adoption smallint check (adoption between 1 and 5),     -- uso real de IA en el servicio
  still_using_ai boolean,
  impact text,                                              -- evidencia de impacto / promesa de agilidad
  client_perception text,
  next_step text,
  recorded_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (talent_id, wave_id, kind)
);

-- ───────────── RLS: solo staff (admin / Delivery). Clientes, mentores y Kibers no ven esta capa. ─────────────
alter table public.talent enable row level security;
alter table public.service_status_history enable row level security;
alter table public.follow_ups enable row level security;

drop policy if exists talent_staff_read on public.talent;
create policy talent_staff_read on public.talent for select using (public.is_staff());
drop policy if exists talent_staff_update on public.talent;
create policy talent_staff_update on public.talent for update using (public.is_staff()) with check (public.is_staff());
drop policy if exists talent_admin_write on public.talent;
create policy talent_admin_write on public.talent for insert with check (public.is_admin());

drop policy if exists ssh_staff on public.service_status_history;
create policy ssh_staff on public.service_status_history for select using (public.is_staff());

drop policy if exists fu_staff on public.follow_ups;
create policy fu_staff on public.follow_ups for all using (public.is_staff()) with check (public.is_staff());

-- Waves pasadas como registros (sin datos inventados: fechas y reglas quedan en null hasta cargarlas).
insert into public.waves (id, name, status, rules_version) values
  ('wave-1', 'AI Edge Talent · Wave 1', 'CLOSED', 'HISTÓRICA'),
  ('wave-2', 'AI Edge Talent · Wave 2', 'CLOSED', 'HISTÓRICA')
on conflict (id) do nothing;

-- La columna nueva también debe ser legible (candidates usa permisos por columna desde la Fase 2).
grant select (talent_id) on public.candidates to authenticated;
