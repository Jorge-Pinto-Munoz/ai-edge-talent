-- AET Platform · Fase 2: Journey
-- Capas del framework: Assessment → AI Mindset → Role Enablement → AI Lab & Showcase (+ Cierre).
-- Video explicativo por etapa, micro-cápsulas con material y tareas, carga de certificación AI CERT,
-- grupos con mentores asignados y feedback semanal desde Role Enablement.
--
-- Archivos (videos, materiales, entregas, certificados) viven en Supabase Storage en buckets PRIVADOS.
-- Todo acceso pasa por el servidor, que valida permisos y entrega URLs firmadas de corta duración.

create type public.journey_layer as enum ('ASSESSMENT', 'AI_MINDSET', 'ROLE_ENABLEMENT', 'AI_LAB_SHOWCASE', 'CLOSURE');

alter table public.candidates
  add column journey_layer public.journey_layer,
  add column journey_layer_since timestamptz;

-- ───────────── Funciones de acceso ─────────────
create or replace function public.is_mentor() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'mentor' from public.profiles where id = auth.uid()), false)
$$;

-- Candidato inscrito (o en journey) en la Wave, para el usuario actual.
create or replace function public.is_participant_of(p_wave text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.candidates
    where user_id = auth.uid() and wave_id = p_wave
      and status in ('CONDITIONS_ACCEPTED', 'ENROLLED', 'MINDSET_READY')
  )
$$;

create or replace function public.my_candidate_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from public.candidates where user_id = auth.uid()
$$;

-- ───────────── Guías por etapa (video explicativo) ─────────────
create table public.stage_guides (
  wave_id text not null references public.waves (id) on delete cascade,
  layer public.journey_layer not null,
  title text not null,
  summary text,
  what_happens text,
  what_we_expect text,
  video_url text,          -- enlace externo (YouTube no listado, Vimeo, Stream…)
  video_path text,         -- o archivo en Storage (bucket content)
  updated_at timestamptz not null default now(),
  primary key (wave_id, layer)
);

-- ───────────── Micro-cápsulas ─────────────
create table public.capsules (
  id uuid primary key default gen_random_uuid(),
  wave_id text not null references public.waves (id) on delete cascade,
  layer public.journey_layer not null,
  position int not null default 1,
  title text not null,
  description text,
  duration_min int,
  video_url text,
  video_path text,
  resources jsonb not null default '[]'::jsonb,   -- [{ name, path, size }]
  task_prompt text,                                 -- si existe, la cápsula tiene tarea entregable
  task_required boolean not null default false,
  max_attempts int,                                 -- p.ej. 2 en AI First Mindset; null = sin máximo
  due_date date,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index capsules_wave_layer on public.capsules (wave_id, layer, position);

create table public.capsule_progress (
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  capsule_id uuid not null references public.capsules (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (candidate_id, capsule_id)
);

-- ───────────── Entregas de tareas ─────────────
-- Resultado de revisión: APPROVED / NOT_APPROVED / HUMAN_REVIEW. REVISIÓN HUMANA no consume intento.
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  capsule_id uuid not null references public.capsules (id) on delete cascade,
  attempt int not null,
  text_answer text,
  files jsonb not null default '[]'::jsonb,
  status text not null default 'SUBMITTED' check (status in ('SUBMITTED', 'APPROVED', 'NOT_APPROVED', 'HUMAN_REVIEW')),
  score numeric(5, 2),
  feedback text,
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  submitted_at timestamptz not null default now(),
  unique (candidate_id, capsule_id, attempt)
);

-- ───────────── Certificación AI CERT ─────────────
create table public.certifications (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  kind text not null default 'AI_CERT',
  attempt int not null default 1,
  result text not null check (result in ('PASSED', 'FAILED')),
  file_path text,
  credential_url text,
  issued_on date,
  status text not null default 'PENDING_REVIEW' check (status in ('PENDING_REVIEW', 'VERIFIED', 'REJECTED')),
  review_note text,
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ───────────── Movimientos de etapa (append-only) ─────────────
create table public.journey_events (
  id bigint generated always as identity primary key,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  from_layer public.journey_layer,
  to_layer public.journey_layer not null,
  exception boolean not null default false,   -- avance por excepción explícita (Product Lead)
  note text,
  actor uuid references auth.users (id),
  at timestamptz not null default now()
);
create trigger journey_events_append_only before update or delete on public.journey_events
  for each row execute function public.forbid_mutation();

-- ───────────── Grupos, mentores y feedback semanal ─────────────
create table public.wave_groups (
  id uuid primary key default gen_random_uuid(),
  wave_id text not null references public.waves (id) on delete cascade,
  name text not null,
  feedback_from public.journey_layer not null default 'ROLE_ENABLEMENT',
  created_at timestamptz not null default now(),
  unique (wave_id, name)
);
create table public.group_members (
  group_id uuid not null references public.wave_groups (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  primary key (group_id, candidate_id)
);
create table public.group_mentors (
  group_id uuid not null references public.wave_groups (id) on delete cascade,
  mentor_id uuid not null references public.profiles (id) on delete cascade,
  primary key (group_id, mentor_id)
);

create or replace function public.mentors_candidate(p_candidate uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_members gm join public.group_mentors gt on gt.group_id = gm.group_id
    where gm.candidate_id = p_candidate and gt.mentor_id = auth.uid()
  )
$$;
create or replace function public.mentors_group(p_group uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.group_mentors where group_id = p_group and mentor_id = auth.uid())
$$;

-- Feedback semanal del mentor sobre cada persona (week_start = lunes de la semana).
create table public.weekly_feedback (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.wave_groups (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  mentor_id uuid not null references public.profiles (id),
  week_start date not null check (extract(isodow from week_start) = 1),
  attendance text not null check (attendance in ('FULL', 'PARTIAL', 'NONE')),
  progress smallint not null check (progress between 1 and 5),
  risk text not null check (risk in ('LOW', 'MEDIUM', 'HIGH')),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mentor_id, candidate_id, week_start)
);
-- Feedback semanal del mentor sobre el curso / acompañamiento del grupo.
create table public.group_weekly_notes (
  group_id uuid not null references public.wave_groups (id) on delete cascade,
  mentor_id uuid not null references public.profiles (id),
  week_start date not null check (extract(isodow from week_start) = 1),
  course_feedback text not null,
  blockers text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (group_id, mentor_id, week_start)
);

create trigger capsules_touch before update on public.capsules for each row execute function public.touch_updated_at();
create trigger feedback_touch before update on public.weekly_feedback for each row execute function public.touch_updated_at();
create trigger notes_touch before update on public.group_weekly_notes for each row execute function public.touch_updated_at();

-- ───────────── Vista general para clientes (agregada, sin datos de evaluación) ─────────────
create or replace view public.client_wave_overview with (security_invoker = false) as
select c.wave_id, w.name as wave_name, w.status as wave_status,
       coalesce(c.journey_layer::text, 'ADMISSION') as layer, count(*)::int as people
from public.candidates c join public.waves w on w.id = c.wave_id
where c.status in ('CONDITIONS_ACCEPTED', 'ENROLLED', 'MINDSET_READY')
  and (public.is_staff()
       or (public.current_role() = 'client' and c.client_name = (select client_name from public.profiles where id = auth.uid())))
group by c.wave_id, w.name, w.status, coalesce(c.journey_layer::text, 'ADMISSION');
grant select on public.client_wave_overview to authenticated;

-- Extiende la vista de estado por persona con la etapa del journey (sigue sin evaluación).
create or replace view public.client_candidate_journey with (security_invoker = false) as
select c.id, c.wave_id, c.full_name, c.role_title, c.client_name, c.journey_layer, c.journey_layer_since
from public.candidates c
where c.status in ('CONDITIONS_ACCEPTED', 'ENROLLED', 'MINDSET_READY')
  and (public.is_staff()
       or (public.current_role() = 'client' and c.client_name = (select client_name from public.profiles where id = auth.uid())));
grant select on public.client_candidate_journey to authenticated;

-- ───────────── RLS ─────────────
alter table public.stage_guides enable row level security;
alter table public.capsules enable row level security;
alter table public.capsule_progress enable row level security;
alter table public.submissions enable row level security;
alter table public.certifications enable row level security;
alter table public.journey_events enable row level security;
alter table public.wave_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_mentors enable row level security;
alter table public.weekly_feedback enable row level security;
alter table public.group_weekly_notes enable row level security;

-- Contenido: staff lo gestiona; participantes y mentores leen lo publicado de su Wave.
create policy guides_read on public.stage_guides for select
  using (public.is_staff() or public.is_participant_of(wave_id) or public.is_mentor());
create policy guides_write on public.stage_guides for all using (public.is_admin()) with check (public.is_admin());
create policy capsules_read on public.capsules for select
  using (public.is_staff() or ((public.is_participant_of(wave_id) or public.is_mentor()) and published));
create policy capsules_write on public.capsules for all using (public.is_admin()) with check (public.is_admin());

-- Progreso: el Kiber marca lo suyo; staff y mentores leen.
create policy progress_self on public.capsule_progress for all
  using (candidate_id in (select public.my_candidate_ids())) with check (candidate_id in (select public.my_candidate_ids()));
create policy progress_staff on public.capsule_progress for select using (public.is_staff() or public.mentors_candidate(candidate_id));

-- Entregas: el Kiber lee las suyas (la creación pasa por el servidor, que valida intentos);
-- staff lee y revisa; el mentor lee las de su grupo.
create policy subs_self on public.submissions for select using (candidate_id in (select public.my_candidate_ids()));
create policy subs_staff on public.submissions for all using (public.is_staff()) with check (public.is_staff());
create policy subs_mentor on public.submissions for select using (public.mentors_candidate(candidate_id));

create policy certs_self on public.certifications for select using (candidate_id in (select public.my_candidate_ids()));
create policy certs_staff on public.certifications for all using (public.is_staff()) with check (public.is_staff());
create policy certs_mentor on public.certifications for select using (public.mentors_candidate(candidate_id));

create policy jevents_staff on public.journey_events for select using (public.is_staff());
create policy jevents_self on public.journey_events for select using (candidate_id in (select public.my_candidate_ids()));
create policy jevents_insert on public.journey_events for insert with check (public.is_admin() and actor = auth.uid());

-- Grupos: admin gestiona; Delivery lee; mentor lee los suyos.
create policy groups_admin on public.wave_groups for all using (public.is_admin()) with check (public.is_admin());
create policy groups_read on public.wave_groups for select using (public.is_staff() or public.mentors_group(id));
create policy members_admin on public.group_members for all using (public.is_admin()) with check (public.is_admin());
create policy members_read on public.group_members for select using (public.is_staff() or public.mentors_group(group_id));
create policy mentors_admin on public.group_mentors for all using (public.is_admin()) with check (public.is_admin());
create policy mentors_read on public.group_mentors for select using (public.is_staff() or mentor_id = auth.uid());

-- El mentor ve a las personas de sus grupos (datos básicos; nunca la evaluación de admisión).
create policy candidates_mentor on public.candidates for select using (public.mentors_candidate(id));

-- Feedback semanal: el mentor escribe y edita lo suyo solo para personas de sus grupos; staff lee; el Kiber no.
create policy wf_mentor on public.weekly_feedback for all
  using (mentor_id = auth.uid())
  with check (mentor_id = auth.uid() and public.mentors_group(group_id) and public.mentors_candidate(candidate_id));
create policy wf_staff on public.weekly_feedback for select using (public.is_staff());
create policy notes_mentor on public.group_weekly_notes for all
  using (mentor_id = auth.uid()) with check (mentor_id = auth.uid() and public.mentors_group(group_id));
create policy notes_staff on public.group_weekly_notes for select using (public.is_staff());

-- ───────────── Storage (buckets privados) ─────────────
-- content: videos y materiales · submissions: entregas · certificates: certificados AI CERT
insert into storage.buckets (id, name, public) values
  ('content', 'content', false), ('submissions', 'submissions', false), ('certificates', 'certificates', false)
on conflict (id) do nothing;

-- ───────────── Protección del enlace personal ─────────────
-- invite_token permite actuar como el postulante: ningún usuario autenticado lo lee por la API
-- (solo el servidor con la clave secreta, para armar los enlaces de los correos).
revoke select on public.candidates from authenticated, anon;
grant select (id, wave_id, full_name, corporate_email, client_name, role_title, team, specialty, delivery_owner,
              source, status, user_id, external_ref, created_at, updated_at, journey_layer, journey_layer_since)
  on public.candidates to authenticated;
