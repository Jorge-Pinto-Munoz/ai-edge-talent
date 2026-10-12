-- AET Platform · Avance AI CERT por participante y pulsos dentro de la plataforma (reemplazan Typeform). Re-ejecutable.
--  * aicert_progress: ruta (introductorio + especialista) y avance por tramo. Solo el líder del programa (admin) lo actualiza;
--    cada cambio queda en aicert_progress_history (sirve para el TPV: avance verificado entre T0 y T1).
--  * pulse_responses: una respuesta por pulso y persona. Cada uno escribe y lee lo suyo; el informe lo arma el servidor para staff.

-- ───────────── Avance AI CERT ─────────────
create table if not exists public.aicert_progress (
  candidate_id uuid primary key references public.candidates (id) on delete cascade,
  intro_course text check (char_length(intro_course) <= 120),
  specialist_course text check (char_length(specialist_course) <= 120),
  -- Curso en el que va: INTRO o SPECIALIST. El tramo (1 a 5) y el % son del curso en curso.
  course text not null default 'INTRO' check (course in ('INTRO', 'SPECIALIST')),
  tramo smallint not null default 0 check (tramo between 0 and 5),
  percent smallint not null default 0 check (percent between 0 and 100),
  exam_date date,
  note text check (char_length(note) <= 500),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

create table if not exists public.aicert_progress_history (
  id bigint generated always as identity primary key,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  course text not null,
  tramo smallint not null,
  percent smallint not null,
  at timestamptz not null default now(),
  by uuid references auth.users (id)
);
create index if not exists aicert_history_candidate on public.aicert_progress_history (candidate_id, at);

create or replace function public.log_aicert_progress() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.course is distinct from old.course or new.tramo is distinct from old.tramo or new.percent is distinct from old.percent then
    insert into public.aicert_progress_history (candidate_id, course, tramo, percent, by) values (new.candidate_id, new.course, new.tramo, new.percent, auth.uid());
  end if;
  return new;
end $$;
drop trigger if exists aicert_progress_log on public.aicert_progress;
create trigger aicert_progress_log after insert or update on public.aicert_progress for each row execute function public.log_aicert_progress();

alter table public.aicert_progress enable row level security;
alter table public.aicert_progress_history enable row level security;
drop policy if exists aicert_read on public.aicert_progress;
create policy aicert_read on public.aicert_progress for select
  using (public.is_staff() or candidate_id in (select public.my_candidate_ids()) or public.mentors_candidate(candidate_id));
drop policy if exists aicert_write on public.aicert_progress;
create policy aicert_write on public.aicert_progress for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists aicert_hist_read on public.aicert_progress_history;
create policy aicert_hist_read on public.aicert_progress_history for select
  using (public.is_staff() or candidate_id in (select public.my_candidate_ids()));

-- El cliente ve el avance por tramo de sus profesionales (sin puntajes).
create or replace view public.client_candidate_journey with (security_invoker = false) as
select c.id, c.wave_id, c.full_name, c.role_title, c.client_name, c.journey_layer, c.journey_layer_since,
       p.course as aicert_course, p.tramo as aicert_tramo, p.percent as aicert_percent,
       case p.course when 'SPECIALIST' then p.specialist_course else p.intro_course end as aicert_course_name
from public.candidates c
left join public.aicert_progress p on p.candidate_id = c.id
where c.status in ('CONDITIONS_ACCEPTED', 'ENROLLED', 'MINDSET_READY')
  and (public.is_staff()
       or (public.current_role() = 'client' and c.client_name = (select client_name from public.profiles where id = auth.uid())));
grant select on public.client_candidate_journey to authenticated;

-- ───────────── Pulsos ─────────────
create table if not exists public.pulse_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  wave_id text not null references public.waves (id) on delete cascade,
  pulse text not null check (pulse ~ '^[A-Z_0-9]{2,40}$'),
  respondent text not null check (respondent in ('KIBER', 'CLIENT')),
  user_id uuid not null references auth.users (id) on delete cascade,
  candidate_id uuid references public.candidates (id) on delete cascade,
  client_name text,
  answers jsonb not null check (jsonb_typeof(answers) = 'object' and pg_column_size(answers) < 16000),
  unique (wave_id, pulse, user_id)
);
create index if not exists pulse_wave on public.pulse_responses (wave_id, pulse);

alter table public.pulse_responses enable row level security;
drop policy if exists pulse_read on public.pulse_responses;
create policy pulse_read on public.pulse_responses for select using (public.is_staff() or user_id = auth.uid());
-- La escritura la hace el servidor tras validar (llave de servicio): sin políticas de insert/update para usuarios.
