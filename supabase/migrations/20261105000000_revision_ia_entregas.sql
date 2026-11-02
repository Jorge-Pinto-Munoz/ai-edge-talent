-- Revisión con IA de las entregas (borrador para quien revisa; la decisión siempre es humana). Re-ejecutable.
create table if not exists public.submission_ai_reviews (
  submission_id uuid primary key references public.submissions (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'done', 'error')),
  score numeric,
  threshold int,
  verdict text,
  criteria jsonb not null default '[]'::jsonb,
  strengths jsonb not null default '[]'::jsonb,
  improvements jsonb not null default '[]'::jsonb,
  feedback text,
  internal_note text,
  model text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.submission_ai_reviews enable row level security;
-- Solo lo leen el admin y el Delivery asignado; el profesional nunca ve el borrador. Escribe solo el servidor.
drop policy if exists sub_ai_read on public.submission_ai_reviews;
create policy sub_ai_read on public.submission_ai_reviews for select
  using (public.is_admin() or exists (select 1 from public.submissions s where s.id = submission_id and public.is_delivery_of(s.candidate_id)));
