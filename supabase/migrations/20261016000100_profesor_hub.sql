-- AET Platform · Profesor (cierre semanal) y Líder Hub AI (AI Lab y Showcase). Re-ejecutable.

-- ───────────── Equipo por Wave ─────────────
-- Qué profesor(es) y líder(es) del Hub trabajan en cada Wave. Por correo: sirve aunque aún no hayan ingresado.
create table if not exists public.wave_staff (
  wave_id text not null references public.waves (id) on delete cascade,
  email text not null check (email = lower(email)),
  role text not null check (role in ('profesor', 'hub')),
  added_by uuid references auth.users (id),
  added_at timestamptz not null default now(),
  primary key (wave_id, email, role)
);

create or replace function public.my_email() returns text
language sql stable security definer set search_path = public as $$
  select lower(email) from public.profiles where id = auth.uid()
$$;

create or replace function public.is_wave_staff(p_wave text, p_role text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wave_staff ws join public.profiles p on p.id = auth.uid()
    where ws.wave_id = p_wave and ws.role = p_role and ws.email = lower(p.email) and p.role::text = p_role
  )
$$;

alter table public.wave_staff enable row level security;
drop policy if exists wave_staff_read on public.wave_staff;
create policy wave_staff_read on public.wave_staff for select using (public.is_staff() or email = public.my_email());
drop policy if exists wave_staff_admin on public.wave_staff;
create policy wave_staff_admin on public.wave_staff for all using (public.is_admin()) with check (public.is_admin());

-- Profesor y Hub leen a los participantes de sus Waves (las columnas siguen restringidas: sin invite_token).
drop policy if exists candidates_wave_staff on public.candidates;
create policy candidates_wave_staff on public.candidates for select
  using (public.is_wave_staff(wave_id, 'profesor') or public.is_wave_staff(wave_id, 'hub'));

-- El Hub ve las certificaciones de su Wave (gate de entrada al Lab).
drop policy if exists certs_hub on public.certifications;
create policy certs_hub on public.certifications for select
  using (exists (select 1 from public.candidates c where c.id = candidate_id and public.is_wave_staff(c.wave_id, 'hub')));

-- ───────────── Profesor: cierre semanal ─────────────
create table if not exists public.teacher_weekly_reports (
  id uuid primary key default gen_random_uuid(),
  wave_id text not null references public.waves (id) on delete cascade,
  week_start date not null,
  author uuid not null default auth.uid() references auth.users (id),
  general_feedback text,          -- feedback general de la clase
  closed_at timestamptz,          -- semana cerrada por el profesor
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wave_id, week_start, author)
);
create table if not exists public.teacher_weekly_entries (
  report_id uuid not null references public.teacher_weekly_reports (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  status text not null default 'AL_DIA' check (status in ('AL_DIA', 'EN_RIESGO', 'ATRASADO')),
  progress smallint check (progress between 0 and 100),   -- avance estimado del curso
  attended boolean,
  note text,
  flag text not null default 'NONE' check (flag in ('NONE', 'CONCERN', 'HIGHLIGHT')),  -- preocupante / destacado
  primary key (report_id, candidate_id)
);
alter table public.teacher_weekly_reports enable row level security;
alter table public.teacher_weekly_entries enable row level security;
drop policy if exists twr_read on public.teacher_weekly_reports;
create policy twr_read on public.teacher_weekly_reports for select using (public.is_staff() or author = auth.uid());
drop policy if exists twr_write on public.teacher_weekly_reports;
create policy twr_write on public.teacher_weekly_reports for all
  using (public.is_admin() or (author = auth.uid() and public.is_wave_staff(wave_id, 'profesor')))
  with check (public.is_admin() or (author = auth.uid() and public.is_wave_staff(wave_id, 'profesor')));
drop policy if exists twe_read on public.teacher_weekly_entries;
create policy twe_read on public.teacher_weekly_entries for select
  using (exists (select 1 from public.teacher_weekly_reports r where r.id = report_id and (public.is_staff() or r.author = auth.uid())));
drop policy if exists twe_write on public.teacher_weekly_entries;
create policy twe_write on public.teacher_weekly_entries for all
  using (exists (select 1 from public.teacher_weekly_reports r where r.id = report_id and (public.is_admin() or (r.author = auth.uid() and public.is_wave_staff(r.wave_id, 'profesor')))))
  with check (exists (select 1 from public.teacher_weekly_reports r join public.candidates c on c.id = candidate_id
    where r.id = report_id and c.wave_id = r.wave_id and (public.is_admin() or (r.author = auth.uid() and public.is_wave_staff(r.wave_id, 'profesor')))));
drop trigger if exists twr_touch on public.teacher_weekly_reports;
create trigger twr_touch before update on public.teacher_weekly_reports for each row execute function public.touch_updated_at();

-- ───────────── AI Lab y Showcase (Líder Hub AI) ─────────────
-- Clase 1: llegan con la idea del desafío. Clase 2: llegan con lo construido.
create table if not exists public.lab_sessions (
  id uuid primary key default gen_random_uuid(),
  wave_id text not null references public.waves (id) on delete cascade,
  n smallint not null check (n in (1, 2)),
  held_on date,
  notes text,
  created_by uuid references auth.users (id),
  updated_at timestamptz not null default now(),
  unique (wave_id, n)
);
create table if not exists public.lab_projects (
  id uuid primary key default gen_random_uuid(),
  wave_id text not null references public.waves (id) on delete cascade,
  title text not null,
  problem text,                     -- necesidad real validada con el cliente
  client_name text,
  mode text not null default 'INDIVIDUAL' check (mode in ('INDIVIDUAL', 'GROUP')),
  status text not null default 'IDEA' check (status in ('IDEA', 'BUILDING', 'READY', 'PRESENTED')),
  hub_notes text,
  showcase_date date,
  showcase_decision text check (showcase_decision is null or showcase_decision in ('CONTINUA', 'PILOTO', 'AJUSTAR', 'NO_CONTINUA')),
  showcase_notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.lab_project_members (
  project_id uuid not null references public.lab_projects (id) on delete cascade,
  candidate_id uuid not null unique references public.candidates (id) on delete cascade,  -- una persona, un proyecto
  primary key (project_id, candidate_id)
);
create table if not exists public.lab_session_entries (
  session_id uuid not null references public.lab_sessions (id) on delete cascade,
  project_id uuid not null references public.lab_projects (id) on delete cascade,
  attended boolean,
  note text,                        -- qué trajo: la idea (clase 1) o lo construido (clase 2)
  primary key (session_id, project_id)
);
create table if not exists public.lab_project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.lab_projects (id) on delete cascade,
  path text not null,               -- bucket privado lab
  name text not null,
  size_bytes bigint,
  kind text not null default 'PRESENTATION' check (kind in ('PRESENTATION', 'OTHER')),
  uploaded_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create or replace function public.lab_member(p_project uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lab_project_members m join public.candidates c on c.id = m.candidate_id
                 where m.project_id = p_project and c.user_id = auth.uid())
$$;
create or replace function public.lab_project_wave(p_project uuid) returns text
language sql stable security definer set search_path = public as $$
  select wave_id from public.lab_projects where id = p_project
$$;

alter table public.lab_sessions enable row level security;
alter table public.lab_projects enable row level security;
alter table public.lab_project_members enable row level security;
alter table public.lab_session_entries enable row level security;
alter table public.lab_project_files enable row level security;

drop policy if exists lab_sessions_read on public.lab_sessions;
create policy lab_sessions_read on public.lab_sessions for select using (public.is_staff() or public.is_wave_staff(wave_id, 'hub'));
drop policy if exists lab_sessions_write on public.lab_sessions;
create policy lab_sessions_write on public.lab_sessions for all using (public.is_admin() or public.is_wave_staff(wave_id, 'hub')) with check (public.is_admin() or public.is_wave_staff(wave_id, 'hub'));

drop policy if exists lab_projects_read on public.lab_projects;
create policy lab_projects_read on public.lab_projects for select using (public.is_staff() or public.is_wave_staff(wave_id, 'hub') or public.lab_member(id));
drop policy if exists lab_projects_write on public.lab_projects;
create policy lab_projects_write on public.lab_projects for all using (public.is_admin() or public.is_wave_staff(wave_id, 'hub')) with check (public.is_admin() or public.is_wave_staff(wave_id, 'hub'));

drop policy if exists lab_members_read on public.lab_project_members;
create policy lab_members_read on public.lab_project_members for select
  using (public.is_staff() or public.is_wave_staff(public.lab_project_wave(project_id), 'hub') or public.lab_member(project_id));
drop policy if exists lab_members_write on public.lab_project_members;
create policy lab_members_write on public.lab_project_members for all
  using (public.is_admin() or public.is_wave_staff(public.lab_project_wave(project_id), 'hub'))
  with check (public.is_admin() or public.is_wave_staff(public.lab_project_wave(project_id), 'hub'));

drop policy if exists lab_entries_read on public.lab_session_entries;
create policy lab_entries_read on public.lab_session_entries for select using (public.is_staff() or public.is_wave_staff(public.lab_project_wave(project_id), 'hub'));
drop policy if exists lab_entries_write on public.lab_session_entries;
create policy lab_entries_write on public.lab_session_entries for all
  using (public.is_admin() or public.is_wave_staff(public.lab_project_wave(project_id), 'hub'))
  with check (public.is_admin() or public.is_wave_staff(public.lab_project_wave(project_id), 'hub'));

drop policy if exists lab_files_read on public.lab_project_files;
create policy lab_files_read on public.lab_project_files for select
  using (public.is_staff() or public.is_wave_staff(public.lab_project_wave(project_id), 'hub') or public.lab_member(project_id));
-- La subida la registra el servidor (verifica que quien sube sea integrante del proyecto o del Hub).

drop trigger if exists lab_projects_touch on public.lab_projects;
create trigger lab_projects_touch before update on public.lab_projects for each row execute function public.touch_updated_at();

insert into storage.buckets (id, name, public) values ('lab', 'lab', false) on conflict (id) do nothing;

grant select (talent_id) on public.candidates to authenticated;
