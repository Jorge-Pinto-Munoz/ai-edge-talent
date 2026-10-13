-- IA en la plataforma (re-ejecutable).
--   * help_questions: preguntas escritas en Ayuda (límite de uso por red y fuente para mejorar las respuestas preparadas)
--   * ai_summaries:   síntesis de los textos de los pulsos de cierre, guardadas para no recalcular

create table if not exists public.help_questions (
  id bigint generated always as identity primary key,
  question text not null,
  audience text not null default 'profesional' check (audience in ('profesional', 'cliente')),
  -- ai: respondió el asistente · team: lo deriva al equipo · off: IA no configurada o límite alcanzado
  outcome text not null check (outcome in ('ai', 'team', 'off')),
  ip_hash text,
  page text,
  created_at timestamptz not null default now()
);
create index if not exists help_questions_ip on public.help_questions (ip_hash, created_at);
alter table public.help_questions enable row level security;
drop policy if exists help_questions_admin on public.help_questions;
create policy help_questions_admin on public.help_questions for select using (public.is_admin());

create table if not exists public.ai_summaries (
  wave_id text not null references public.waves (id) on delete cascade,
  layer public.journey_layer not null,
  input_hash text not null,
  content jsonb not null,
  model text not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  primary key (wave_id, layer)
);
alter table public.ai_summaries enable row level security;
drop policy if exists ai_summaries_admin on public.ai_summaries;
create policy ai_summaries_admin on public.ai_summaries for select using (public.is_admin());

-- Las preguntas de Ayuda se guardan 180 días.
create or replace function public.purge_help_questions() returns void
language sql security definer set search_path = public as $$
  delete from public.help_questions where created_at < now() - interval '180 days'
$$;
