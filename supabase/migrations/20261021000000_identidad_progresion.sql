-- AET Platform · Identidad unificada (correo + PIN), administración de cuentas, asignaciones Delivery,
-- cierre de etapas con pulso obligatorio, solicitudes de acceso especial, consentimientos, notificaciones y auditoría.
-- Re-ejecutable: el workflow corre todas las migraciones en cada despliegue.
--
-- Separación de conceptos (decisión de producto):
--   * Estado de cuenta (profiles.status)            → ¿puede ingresar?
--   * Estado de admisión (candidates.status)        → ¿fue seleccionado e inscrito?
--   * Etapa formativa (candidates.journey_layer)    → ¿en qué etapa va?
--   * Cierre de etapa (stage_closures)              → requisitos + pulso → etapa cerrada → siguiente desbloqueada

-- ───────────── Cuentas ─────────────
alter table public.profiles add column if not exists status text not null default 'ACTIVE';
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists sessions_revoked_at timestamptz;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
do $$ begin
  alter table public.profiles add constraint profiles_status_check check (status in ('PENDING', 'ACTIVE', 'PAUSED', 'REVOKED', 'DELETED'));
exception when duplicate_object then null; end $$;

-- Credencial personal: solo el hash del PIN (scrypt con sal propia). Nadie la lee con su sesión.
create table if not exists public.user_credentials (
  user_id uuid primary key references auth.users (id) on delete cascade,
  pin_hash text,
  pin_set_at timestamptz,
  must_change boolean not null default false,
  failed_count smallint not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.user_credentials enable row level security;

-- Códigos temporales (de un solo uso): ingreso del equipo, activación, restablecimiento y verificación de admin.
alter table public.staff_login_codes add column if not exists purpose text not null default 'LOGIN';
alter table public.staff_login_codes add column if not exists requested_by uuid references auth.users (id);
do $$ begin
  alter table public.staff_login_codes add constraint staff_login_codes_purpose_check check (purpose in ('LOGIN', 'ACTIVATION', 'RESET', 'ADMIN_STEP'));
exception when duplicate_object then null; end $$;
create index if not exists staff_login_codes_purpose on public.staff_login_codes (email, purpose, created_at desc);

-- Intentos de ingreso por correo e IP (protección contra fuerza bruta).
create table if not exists public.login_attempts (
  id bigint generated always as identity primary key,
  email text not null,
  ip_hash text,
  success boolean not null,
  at timestamptz not null default now()
);
create index if not exists login_attempts_email on public.login_attempts (email, at desc);
create index if not exists login_attempts_ip on public.login_attempts (ip_hash, at desc);
alter table public.login_attempts enable row level security;

-- ───────────── Funciones de rol: solo cuentas activas ─────────────
-- Una cuenta pausada, revocada o eliminada pierde sus permisos en la base aunque conserve un token vigente.
create or replace function public.current_role() returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and status in ('ACTIVE', 'PENDING')
$$;
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('admin', 'delivery') from public.profiles where id = auth.uid() and status = 'ACTIVE'), false)
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid() and status = 'ACTIVE'), false)
$$;
create or replace function public.is_mentor() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'mentor' from public.profiles where id = auth.uid() and status = 'ACTIVE'), false)
$$;
create or replace function public.account_active() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select status in ('ACTIVE', 'PENDING') from public.profiles where id = auth.uid()), false)
$$;
create or replace function public.is_participant_of(p_wave text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.account_active() and exists (
    select 1 from public.candidates
    where user_id = auth.uid() and wave_id = p_wave
      and status in ('CONDITIONS_ACCEPTED', 'ENROLLED', 'MINDSET_READY')
  )
$$;
create or replace function public.my_candidate_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from public.candidates where user_id = auth.uid() and public.account_active()
$$;
create or replace function public.is_wave_staff(p_wave text, p_role text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wave_staff ws join public.profiles p on p.id = auth.uid()
    where ws.wave_id = p_wave and ws.role = p_role and ws.email = lower(p.email) and p.role::text = p_role and p.status = 'ACTIVE'
  )
$$;

-- ───────────── Delivery por Wave y asignación de profesionales ─────────────
alter table public.wave_staff drop constraint if exists wave_staff_role_check;
alter table public.wave_staff add constraint wave_staff_role_check check (role in ('profesor', 'hub', 'delivery'));

-- Un Delivery responsable por profesional (el historial queda en audit_log).
create table if not exists public.delivery_assignments (
  candidate_id uuid primary key references public.candidates (id) on delete cascade,
  wave_id text not null references public.waves (id) on delete cascade,
  delivery_email text not null check (delivery_email = lower(delivery_email)),
  assigned_by uuid references auth.users (id),
  assigned_at timestamptz not null default now()
);
create index if not exists delivery_assignments_delivery on public.delivery_assignments (delivery_email, wave_id);
alter table public.delivery_assignments enable row level security;
drop policy if exists assignments_read on public.delivery_assignments;
create policy assignments_read on public.delivery_assignments for select using (public.is_staff());
drop policy if exists assignments_write on public.delivery_assignments;
create policy assignments_write on public.delivery_assignments for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.supervises(p_candidate uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.delivery_assignments a where a.candidate_id = p_candidate and a.delivery_email = public.my_email())
$$;

-- Qué comparte el admin con los Delivery de cada Wave.
create table if not exists public.wave_settings (
  wave_id text primary key references public.waves (id) on delete cascade,
  share_experience boolean not null default false,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);
alter table public.wave_settings enable row level security;
drop policy if exists wave_settings_read on public.wave_settings;
create policy wave_settings_read on public.wave_settings for select using (public.is_staff());
drop policy if exists wave_settings_write on public.wave_settings;
create policy wave_settings_write on public.wave_settings for all using (public.is_admin()) with check (public.is_admin());

-- Respuestas de pulsos: el profesional ve las suyas; el admin todas; el Delivery solo las de quienes supervisa
-- y solo si el admin compartió la experiencia de esa Wave.
drop policy if exists pulse_read on public.pulse_responses;
create policy pulse_read on public.pulse_responses for select using (
  public.is_admin() or user_id = auth.uid()
  or (public.current_role() = 'delivery' and candidate_id is not null and public.supervises(candidate_id)
      and exists (select 1 from public.wave_settings s where s.wave_id = pulse_responses.wave_id and s.share_experience))
);

-- ───────────── Cierre de etapas ─────────────
create table if not exists public.stage_closures (
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  layer public.journey_layer not null,
  pulse_key text not null,
  requirements_met_at timestamptz,
  pulse_submitted_at timestamptz,
  closed_at timestamptz,
  last_reminder_at timestamptz,
  reminders_sent smallint not null default 0,
  delivery_alerted_at timestamptz,
  primary key (candidate_id, layer)
);
alter table public.stage_closures add column if not exists requirements_by_exception boolean not null default false;
alter table public.stage_closures add column if not exists exception_note text;
alter table public.stage_closures add column if not exists updated_at timestamptz not null default now();
create index if not exists stage_closures_pending on public.stage_closures (requirements_met_at) where pulse_submitted_at is null;
alter table public.stage_closures enable row level security;
drop policy if exists closures_read on public.stage_closures;
create policy closures_read on public.stage_closures for select using (
  public.is_admin() or candidate_id in (select public.my_candidate_ids())
  or (public.current_role() = 'delivery' and public.supervises(candidate_id))
);

-- ───────────── Solicitudes de acceso especial ─────────────
create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (email = lower(email)),
  phone text,
  reason text not null check (reason in ('RETOMA', 'WAVE_ANTERIOR', 'HISTORICO', 'MIGRACION', 'OTRO')),
  description text not null check (char_length(description) between 10 and 2000),
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  decided_at timestamptz,
  decided_by uuid references auth.users (id),
  decision_note text,
  resume_layer public.journey_layer,
  candidate_id uuid references public.candidates (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null
);
create index if not exists access_requests_status on public.access_requests (status, created_at desc);
alter table public.access_requests enable row level security;
drop policy if exists access_requests_admin on public.access_requests;
create policy access_requests_admin on public.access_requests for select using (public.is_admin());

-- ───────────── Consentimientos ─────────────
create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('COMMUNITY', 'STAGE_RULES')),
  version text not null,
  text_snapshot text not null,
  email text not null check (email = lower(email)),
  user_id uuid references auth.users (id) on delete set null,
  candidate_id uuid references public.candidates (id) on delete set null,
  accepted_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists consents_email on public.consents (email, kind);
alter table public.consents enable row level security;
drop policy if exists consents_read on public.consents;
create policy consents_read on public.consents for select using (public.is_admin() or user_id = auth.uid());

alter table public.candidates add column if not exists phone text;

-- ───────────── Comunicaciones: reintentos y destinatario ─────────────
alter table public.email_messages add column if not exists attempts smallint not null default 1;
alter table public.email_messages add column if not exists user_id uuid references auth.users (id) on delete set null;
alter table public.email_messages add column if not exists kind text;
create index if not exists email_messages_failed on public.email_messages (status, created_at) where status = 'failed';

-- Configuración operativa (recordatorios) editable por admin.
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings for select using (public.is_staff());
insert into public.app_settings (key, value) values ('reminders', '{"every_days": 3, "max": 3, "delivery_after_days": 5}') on conflict (key) do nothing;

-- ───────────── Auditoría (eventos de dominio) ─────────────
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  action text not null,                 -- p. ej. user.activated, stage.closed, pulse.submitted
  event_key text unique,                -- idempotencia: el mismo evento no se procesa dos veces
  actor uuid references auth.users (id) on delete set null,
  actor_email text,
  target_user uuid references auth.users (id) on delete set null,
  target_email text,
  candidate_id uuid references public.candidates (id) on delete set null,
  wave_id text,
  details jsonb not null default '{}'::jsonb
);
create index if not exists audit_log_target on public.audit_log (target_email, at desc);
create index if not exists audit_log_candidate on public.audit_log (candidate_id, at desc);
create index if not exists audit_log_action on public.audit_log (action, at desc);
alter table public.audit_log enable row level security;
drop policy if exists audit_admin on public.audit_log;
create policy audit_admin on public.audit_log for select using (public.is_admin());

-- Altas manuales y por acceso especial (ver también 20261014000000_talento.sql, que fija el mismo conjunto).
alter table public.candidates drop constraint if exists candidates_source_check;
alter table public.candidates add constraint candidates_source_check check (source in ('import', 'nomination', 'self', 'historical', 'manual', 'special', 'demo'));
