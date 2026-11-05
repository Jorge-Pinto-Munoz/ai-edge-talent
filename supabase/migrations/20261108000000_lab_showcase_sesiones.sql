-- AET Platform · AI Lab ≠ Showcase, sesiones de Role Enablement y avance AI CERT del profesional. Re-ejecutable.

-- ───────────── Cierre de etapa: el AI Lab se cierra sin pulso (el pulso «LAB» cierra el Showcase) ─────────────
alter table public.stage_closures alter column pulse_key drop not null;

-- ───────────── AI Lab: el profesional describe su proyecto; el Showcase recibe el archivo final ─────────────
alter table public.lab_projects add column if not exists solution text;           -- qué construye y cómo usa IA
alter table public.lab_projects add column if not exists described_at timestamptz;  -- última vez que el equipo lo describió
-- Tipo de archivo: avance del Lab (PRESENTATION/OTHER, histórico) o presentación final del Showcase (FINAL).
alter table public.lab_project_files drop constraint if exists lab_project_files_kind_check;
alter table public.lab_project_files add constraint lab_project_files_kind_check check (kind in ('PRESENTATION', 'OTHER', 'FINAL'));

-- ───────────── Role Enablement: 4 sesiones por Wave (una por semana) ─────────────
-- Lo que ve el profesional: fecha, tema, notas y material. Lo privado va en tablas aparte (solo admin y profesor).
create table if not exists public.re_sessions (
  wave_id text not null references public.waves (id) on delete cascade,
  n smallint not null check (n between 1 and 4),
  held_on date,
  title text check (char_length(title) <= 160),
  student_notes text check (char_length(student_notes) <= 4000),
  materials jsonb not null default '[]'::jsonb,            -- [{ name, path, size }] en el bucket privado content
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now(),
  primary key (wave_id, n)
);
create table if not exists public.re_session_private (
  wave_id text not null,
  n smallint not null,
  admin_comments text check (char_length(admin_comments) <= 4000),   -- cómo fluyó la clase: solo admin (y el profesor que lo escribe)
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now(),
  primary key (wave_id, n),
  foreign key (wave_id, n) references public.re_sessions (wave_id, n) on delete cascade
);
create table if not exists public.re_session_attendance (
  wave_id text not null,
  n smallint not null,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  attended boolean not null,
  focus text not null default 'OK' check (focus in ('OK', 'LOW', 'HIGH')),  -- concentración observada (privado)
  note text check (char_length(note) <= 600),                             -- comentario del profesor sobre la persona (privado)
  updated_at timestamptz not null default now(),
  primary key (wave_id, n, candidate_id),
  foreign key (wave_id, n) references public.re_sessions (wave_id, n) on delete cascade
);
-- Check-in del profesional: «fui a la sesión». No es la asistencia oficial; se cruza con la del profesor.
create table if not exists public.re_session_checkins (
  wave_id text not null references public.waves (id) on delete cascade,
  n smallint not null check (n between 1 and 4),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  note text check (char_length(note) <= 300),
  created_at timestamptz not null default now(),
  primary key (wave_id, n, candidate_id)
);

alter table public.re_sessions enable row level security;
alter table public.re_session_private enable row level security;
alter table public.re_session_attendance enable row level security;
alter table public.re_session_checkins enable row level security;

-- Lectura. Escritura solo desde el servidor (acciones que validan admin o profesor de la Wave).
drop policy if exists re_sessions_read on public.re_sessions;
create policy re_sessions_read on public.re_sessions for select using (
  public.is_staff() or public.is_wave_staff(wave_id, 'profesor')
  or exists (select 1 from public.candidates c where c.id in (select public.my_candidate_ids()) and c.wave_id = re_sessions.wave_id)
);
drop policy if exists re_private_read on public.re_session_private;
create policy re_private_read on public.re_session_private for select using (public.is_admin() or public.is_wave_staff(wave_id, 'profesor'));
drop policy if exists re_attendance_read on public.re_session_attendance;
create policy re_attendance_read on public.re_session_attendance for select using (public.is_admin() or public.is_wave_staff(wave_id, 'profesor'));
drop policy if exists re_checkins_read on public.re_session_checkins;
create policy re_checkins_read on public.re_session_checkins for select using (
  public.is_staff() or public.is_wave_staff(wave_id, 'profesor') or candidate_id in (select public.my_candidate_ids())
);

-- ───────────── Avance AI CERT reportado por el propio profesional ─────────────
alter table public.aicert_progress add column if not exists self_reported_at timestamptz;   -- último reporte del profesional
alter table public.aicert_progress_history add column if not exists source text not null default 'ADMIN';
alter table public.aicert_progress_history drop constraint if exists aicert_history_source_check;
alter table public.aicert_progress_history add constraint aicert_history_source_check check (source in ('ADMIN', 'SELF'));
create or replace function public.log_aicert_progress() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.course is distinct from old.course or new.tramo is distinct from old.tramo or new.percent is distinct from old.percent then
    insert into public.aicert_progress_history (candidate_id, course, tramo, percent, by, source)
    values (new.candidate_id, new.course, new.tramo, new.percent, coalesce(auth.uid(), new.updated_by),
            case when new.self_reported_at is not null and (tg_op = 'INSERT' or new.self_reported_at is distinct from old.self_reported_at) then 'SELF' else 'ADMIN' end);
  end if;
  return new;
end $$;
