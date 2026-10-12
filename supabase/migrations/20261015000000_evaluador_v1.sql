-- AET Platform · Evaluador de Assessment, especificación operativa v1.
-- Guarda la recomendación al Product Lead, fortalezas y campos insuficientes. Re-ejecutable.

alter table public.ai_evaluations add column if not exists pl_recommendation text;
alter table public.ai_evaluations drop constraint if exists ai_evaluations_pl_recommendation_check;
alter table public.ai_evaluations add constraint ai_evaluations_pl_recommendation_check
  check (pl_recommendation is null or pl_recommendation in ('SELECCIONAR', 'SELECCIONAR_CON_SEGUIMIENTO', 'EVALUAR_CUPO_Y_SEGUIMIENTO', 'ACTIVAR_RESCATE'));
alter table public.ai_evaluations add column if not exists strengths text[];
alter table public.ai_evaluations add column if not exists insufficient_fields text[];

-- ───────────── Video de rescate (sección 8) ─────────────
-- Lo envía la persona bajo el corte desde su enlace personal; el Product Lead (admin) lo reevalúa.
create table if not exists public.rescue_videos (
  candidate_id uuid primary key references public.candidates (id) on delete cascade,
  video_path text,                 -- archivo en el bucket privado submissions
  video_url text,                  -- o enlace (YouTube no listado, Drive, OneDrive, Loom…)
  candidate_note text,
  submitted_at timestamptz not null default now(),
  commitment smallint check (commitment between 1 and 5),
  interest smallint check (interest between 1 and 5),
  ai_affinity smallint check (ai_affinity between 1 and 5),
  review_note text,
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  check (video_path is not null or video_url is not null)
);
alter table public.rescue_videos enable row level security;
drop policy if exists rescue_admin_read on public.rescue_videos;
create policy rescue_admin_read on public.rescue_videos for select using (public.is_admin());
drop policy if exists rescue_admin_review on public.rescue_videos;
create policy rescue_admin_review on public.rescue_videos for update using (public.is_admin()) with check (public.is_admin());
-- Inserción solo desde el servidor (enlace personal validado con la clave secreta).
