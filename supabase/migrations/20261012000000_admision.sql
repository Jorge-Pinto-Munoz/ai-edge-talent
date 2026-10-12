-- AET Platform · Fase 1: Admisión por Wave
-- Base de candidatos por Wave, formulario propio, evaluación IA (propuesta), decisión humana,
-- correos, confirmaciones y compromisos. Todo con Row Level Security.
--
-- Principios:
--  * La IA propone; la decisión la registra una persona (tabla decisions, append-only).
--  * Postular ≠ seleccionado ≠ inscrito (candidates.status sigue la máquina de estados de la app).
--  * Aceptaciones y eventos son append-only: nunca se sobreescriben versiones anteriores.
--  * El cliente nunca lee evaluación ni puntajes (vista client_candidate_status).

create extension if not exists pgcrypto;

-- ───────────── Roles y perfiles ─────────────
do $t$ begin
  create type public.app_role as enum ('admin', 'delivery', 'kiber', 'client');
exception when duplicate_object then null;
end $t$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.app_role not null default 'kiber',
  client_name text,              -- solo para role = 'client'
  created_at timestamptz not null default now()
);

-- Lista de correos con rol asignado por un admin antes de su primer ingreso.
create table if not exists public.role_grants (
  email text primary key check (email = lower(email)),
  role public.app_role not null,
  client_name text,
  granted_by uuid references auth.users (id),
  granted_at timestamptz not null default now()
);

create or replace function public.current_role() returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('admin', 'delivery') from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

-- Al crear un usuario de Auth, crear su perfil con el rol pre-asignado (o kiber por defecto).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare g public.role_grants;
begin
  select * into g from public.role_grants where email = lower(new.email);
  insert into public.profiles (id, email, role, client_name)
  values (new.id, lower(new.email), coalesce(g.role, 'kiber'), g.client_name)
  on conflict (id) do nothing;
  update public.candidates set user_id = new.id where lower(corporate_email) = lower(new.email) and user_id is null;
  return new;
end $$;

-- ───────────── Waves ─────────────
do $t$ begin
  create type public.wave_status as enum
  ('DRAFT', 'PREPARING', 'OPEN_FOR_NOMINATION', 'ASSESSMENT', 'ACTIVE', 'LAB_SHOWCASE', 'CLOSING', 'CLOSED');
exception when duplicate_object then null;
end $t$;

create table if not exists public.waves (
  id text primary key,
  name text not null,
  wave_type text not null default 'REGULAR',
  status public.wave_status not null default 'DRAFT',
  application_deadline timestamptz,
  start_date date,
  estimated_close_date date,
  rules_version text,
  conditions_version text,
  commitment_version text,
  acknowledgement_version text,
  target_cohort_size int,
  created_at timestamptz not null default now()
);

-- ───────────── Candidatos ─────────────
do $t$ begin
  create type public.admission_status as enum (
  'NOMINATED', 'INVITED', 'IDENTIFIED', 'APPLICATION_STARTED', 'APPLICATION_SUBMITTED',
  'ASSESSMENT_EVALUATED', 'HUMAN_REVIEW', 'RESCUE_REQUIRED', 'NOT_SELECTED', 'SELECTED',
  'CONDITIONS_PENDING', 'CONDITIONS_ACCEPTED', 'ENROLLED', 'MINDSET_READY'
);
exception when duplicate_object then null;
end $t$;

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  wave_id text not null references public.waves (id) on delete restrict,
  full_name text not null,
  corporate_email text not null,
  client_name text,
  role_title text,
  team text,
  specialty text,                 -- familia: Ingeniería, QA, Agilidad, Datos…
  delivery_owner text,
  source text not null default 'import' check (source in ('import', 'nomination', 'self')),
  status public.admission_status not null default 'INVITED',
  invite_token text not null unique default encode(gen_random_bytes(18), 'hex'),
  user_id uuid references auth.users (id),
  external_ref text,              -- p.ej. id de Monday
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists candidates_wave_email on public.candidates (wave_id, lower(corporate_email));
create index if not exists candidates_wave_status on public.candidates (wave_id, status);

-- ───────────── Formulario propio ─────────────
create table if not exists public.application_questions (
  id uuid primary key default gen_random_uuid(),
  wave_id text not null references public.waves (id) on delete cascade,
  position int not null,
  prompt text not null,
  help text,
  kind text not null default 'long_text' check (kind in ('long_text', 'short_text', 'single_choice')),
  options jsonb,
  required boolean not null default true,
  unique (wave_id, position)
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null unique references public.candidates (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,   -- { question_id: answer }
  questions_snapshot jsonb,                       -- preguntas tal como se presentaron
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Confirmación informada previa (≠ Carta de Compromiso). Append-only.
create table if not exists public.acknowledgements (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  wave_id text not null references public.waves (id),
  acknowledgement_version text not null,
  confirmed_items text[] not null,
  accepted_at timestamptz not null default now()
);

-- ───────────── Evaluación IA (propuesta) y decisión humana ─────────────
create table if not exists public.ai_evaluations (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  model text not null,
  rubric_version text not null,
  scores jsonb not null,           -- { dimension: { score 1-5, justification, evidence } }
  weighted_total numeric(5, 2) not null,  -- 0-100 = Σ(score × peso) / 5 × 100
  level text not null check (level in ('A', 'B', 'C', 'D')),
  recommendation text not null check (recommendation in ('SELECTED', 'RESCUE_REQUIRED', 'NOT_SELECTED', 'HUMAN_REVIEW')),
  summary text not null,
  risks text[],
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index if not exists ai_evaluations_app on public.ai_evaluations (application_id, created_at desc);

create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  outcome text not null check (outcome in ('SELECTED', 'RESCUE_REQUIRED', 'NOT_SELECTED', 'HUMAN_REVIEW')),
  ai_evaluation_id uuid references public.ai_evaluations (id),
  agrees_with_ai boolean,
  note text,
  decided_by uuid not null references auth.users (id),
  decided_at timestamptz not null default now()
);

-- Historial de estados (append-only).
create table if not exists public.admission_events (
  id bigint generated always as identity primary key,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  from_status public.admission_status,
  to_status public.admission_status not null,
  actor uuid references auth.users (id),
  actor_label text,
  note text,
  at timestamptz not null default now()
);

-- Carta de compromiso: versionada, sin sobreescritura.
do $t$ begin
  create type public.acceptance_status as enum ('NOT_PRESENTED', 'PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'SUPERSEDED');
exception when duplicate_object then null;
end $t$;
create table if not exists public.commitment_acceptances (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  wave_id text not null references public.waves (id),
  document_version text not null,
  conditions_version text not null,
  status public.acceptance_status not null default 'PENDING',
  presented_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by text,
  superseded_by uuid references public.commitment_acceptances (id)
);

-- ───────────── Correos ─────────────
create table if not exists public.email_messages (
  id uuid primary key default gen_random_uuid(),
  wave_id text references public.waves (id),
  candidate_id uuid references public.candidates (id) on delete set null,
  to_email text not null,
  template text not null,
  subject text not null,
  body_text text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  provider_id text,
  error text,
  sent_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

-- ───────────── Triggers ─────────────
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists candidates_touch on public.candidates;
create trigger candidates_touch before update on public.candidates for each row execute function public.touch_updated_at();
drop trigger if exists applications_touch on public.applications;
create trigger applications_touch before update on public.applications for each row execute function public.touch_updated_at();

-- Registrar cada cambio de estado del candidato.
create or replace function public.log_status_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.admission_events (candidate_id, from_status, to_status, actor, actor_label)
    values (new.id, case when tg_op = 'UPDATE' then old.status end, new.status, auth.uid(),
            coalesce(current_setting('aet.actor_label', true), null));
  end if;
  return new;
end $$;
drop trigger if exists candidates_status_log on public.candidates;
create trigger candidates_status_log after insert or update of status on public.candidates
  for each row execute function public.log_status_change();

-- Append-only: impedir UPDATE/DELETE en tablas de auditoría.
create or replace function public.forbid_mutation() returns trigger language plpgsql as $$
begin raise exception 'Tabla append-only: % no permite %', tg_table_name, tg_op; end $$;
drop trigger if exists decisions_append_only on public.decisions;
create trigger decisions_append_only before update or delete on public.decisions for each row execute function public.forbid_mutation();
drop trigger if exists events_append_only on public.admission_events;
create trigger events_append_only before update or delete on public.admission_events for each row execute function public.forbid_mutation();
drop trigger if exists acks_append_only on public.acknowledgements;
create trigger acks_append_only before update or delete on public.acknowledgements for each row execute function public.forbid_mutation();

-- Compromiso: solo se permite cambiar status/superseded_by/aceptación; nunca versión ni fechas pasadas.
create or replace function public.guard_commitment() returns trigger language plpgsql as $$
begin
  if new.document_version <> old.document_version or new.conditions_version <> old.conditions_version
     or new.presented_at <> old.presented_at then
    raise exception 'No se puede modificar la versión de un compromiso ya presentado';
  end if;
  if old.status in ('ACCEPTED', 'DECLINED') and new.status not in ('SUPERSEDED', old.status) then
    raise exception 'Un compromiso % solo puede pasar a SUPERSEDED', old.status;
  end if;
  if new.status = 'ACCEPTED' and old.status <> 'ACCEPTED' then
    new.accepted_at := now();  -- sin aceptación retroactiva
  end if;
  return new;
end $$;
drop trigger if exists commitments_guard on public.commitment_acceptances;
create trigger commitments_guard before update on public.commitment_acceptances for each row execute function public.guard_commitment();
drop trigger if exists commitments_no_delete on public.commitment_acceptances;
create trigger commitments_no_delete before delete on public.commitment_acceptances for each row execute function public.forbid_mutation();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ───────────── Vista para clientes (sin evaluación) ─────────────
create or replace view public.client_candidate_status with (security_invoker = false) as
select c.id, c.wave_id, c.full_name, c.role_title, c.client_name,
  case
    when c.status in ('NOMINATED') then 'Nominado/a'
    when c.status in ('INVITED') then 'Invitado/a a postular'
    when c.status in ('IDENTIFIED', 'APPLICATION_STARTED') then 'Postulación pendiente'
    when c.status in ('APPLICATION_SUBMITTED', 'ASSESSMENT_EVALUATED', 'HUMAN_REVIEW') then 'Postulación completada · en evaluación'
    when c.status = 'RESCUE_REQUIRED' then 'Complementa su postulación'
    when c.status = 'NOT_SELECTED' then 'No avanza en esta Wave'
    when c.status in ('SELECTED', 'CONDITIONS_PENDING', 'CONDITIONS_ACCEPTED') then 'Avanza'
    else 'Inscrito/a en la Wave'
  end as visible_status
from public.candidates c
where public.is_staff()
   or (public.current_role() = 'client'
       and c.client_name = (select client_name from public.profiles where id = auth.uid()));

-- ───────────── Row Level Security ─────────────
alter table public.profiles enable row level security;
alter table public.role_grants enable row level security;
alter table public.waves enable row level security;
alter table public.candidates enable row level security;
alter table public.application_questions enable row level security;
alter table public.applications enable row level security;
alter table public.acknowledgements enable row level security;
alter table public.ai_evaluations enable row level security;
alter table public.decisions enable row level security;
alter table public.admission_events enable row level security;
alter table public.commitment_acceptances enable row level security;
alter table public.email_messages enable row level security;

-- Perfiles: cada uno ve el suyo; staff ve todos; solo admin cambia roles.
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for select using (id = auth.uid() or public.is_staff());
drop policy if exists profiles_admin on public.profiles;
create policy profiles_admin on public.profiles for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists grants_admin on public.role_grants;
create policy grants_admin on public.role_grants for all using (public.is_admin()) with check (public.is_admin());

-- Waves y preguntas: lectura para cualquier usuario autenticado; escritura admin.
drop policy if exists waves_read on public.waves;
create policy waves_read on public.waves for select using (auth.uid() is not null);
drop policy if exists waves_write on public.waves;
create policy waves_write on public.waves for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists questions_read on public.application_questions;
create policy questions_read on public.application_questions for select using (auth.uid() is not null);
drop policy if exists questions_write on public.application_questions;
create policy questions_write on public.application_questions for all using (public.is_admin()) with check (public.is_admin());

-- Candidatos: staff todo; el Kiber solo su propio registro (lectura).
drop policy if exists candidates_staff on public.candidates;
create policy candidates_staff on public.candidates for all using (public.is_staff()) with check (public.is_staff());
drop policy if exists candidates_self on public.candidates;
create policy candidates_self on public.candidates for select using (user_id = auth.uid());

-- Postulación: staff lee; el Kiber lee la suya. La escritura del candidato pasa por el servidor (token).
drop policy if exists applications_staff on public.applications;
create policy applications_staff on public.applications for select using (public.is_staff());
drop policy if exists applications_self on public.applications;
create policy applications_self on public.applications for select
  using (candidate_id in (select id from public.candidates where user_id = auth.uid()));

drop policy if exists acks_staff on public.acknowledgements;
create policy acks_staff on public.acknowledgements for select using (public.is_staff());
drop policy if exists acks_self on public.acknowledgements;
create policy acks_self on public.acknowledgements for select
  using (candidate_id in (select id from public.candidates where user_id = auth.uid()));

-- Evaluación IA y decisiones: SOLO admin (liderazgo del servicio). Ni Kiber, ni cliente, ni Delivery
-- ven puntajes ni ranking; Delivery ve el estado del candidato.
drop policy if exists ai_eval_admin on public.ai_evaluations;
create policy ai_eval_admin on public.ai_evaluations for select using (public.is_admin());
drop policy if exists decisions_admin_read on public.decisions;
create policy decisions_admin_read on public.decisions for select using (public.is_admin());
drop policy if exists decisions_admin_insert on public.decisions;
create policy decisions_admin_insert on public.decisions for insert with check (public.is_admin() and decided_by = auth.uid());

drop policy if exists events_staff on public.admission_events;
create policy events_staff on public.admission_events for select using (public.is_staff());
drop policy if exists events_self on public.admission_events;
create policy events_self on public.admission_events for select
  using (candidate_id in (select id from public.candidates where user_id = auth.uid()));

drop policy if exists commitments_staff on public.commitment_acceptances;
create policy commitments_staff on public.commitment_acceptances for select using (public.is_staff());
drop policy if exists commitments_self on public.commitment_acceptances;
create policy commitments_self on public.commitment_acceptances for select
  using (candidate_id in (select id from public.candidates where user_id = auth.uid()));

drop policy if exists emails_staff on public.email_messages;
create policy emails_staff on public.email_messages for select using (public.is_staff());

grant select on public.client_candidate_status to authenticated;
