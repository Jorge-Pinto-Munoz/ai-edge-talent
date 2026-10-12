-- AET Platform · Profesor: registro de clase y asistencia. Re-ejecutable.
-- Reemplaza el cierre semanal por participante (20261016000100): el profesor ya no califica ni comenta
-- a cada persona; registra cada clase (normalmente una por semana) y quién asistió.
-- El seguimiento para Delivery se calcula desde la asistencia.

drop table if exists public.teacher_weekly_entries;
drop table if exists public.teacher_weekly_reports;

create table if not exists public.teacher_classes (
  id uuid primary key default gen_random_uuid(),
  wave_id text not null references public.waves (id) on delete cascade,
  held_on date not null,
  author uuid not null default auth.uid() references auth.users (id),
  objective text,      -- objetivo de la clase
  topic text,          -- tema abordado
  highlights text,     -- puntos a destacar
  next_steps text,     -- tarea o próximos pasos
  comments text,       -- otros comentarios de la clase
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wave_id, held_on, author)
);
create table if not exists public.teacher_class_attendance (
  class_id uuid not null references public.teacher_classes (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  attended boolean not null,
  primary key (class_id, candidate_id)
);

alter table public.teacher_classes enable row level security;
alter table public.teacher_class_attendance enable row level security;

-- Lectura: equipo interno y profesores de la Wave. Escritura: admin o el profesor autor, en su Wave.
drop policy if exists tc_read on public.teacher_classes;
create policy tc_read on public.teacher_classes for select using (public.is_staff() or public.is_wave_staff(wave_id, 'profesor'));
drop policy if exists tc_write on public.teacher_classes;
create policy tc_write on public.teacher_classes for all
  using (public.is_admin() or (author = auth.uid() and public.is_wave_staff(wave_id, 'profesor')))
  with check (public.is_admin() or (author = auth.uid() and public.is_wave_staff(wave_id, 'profesor')));

drop policy if exists tca_read on public.teacher_class_attendance;
create policy tca_read on public.teacher_class_attendance for select
  using (exists (select 1 from public.teacher_classes t where t.id = class_id and (public.is_staff() or public.is_wave_staff(t.wave_id, 'profesor'))));
drop policy if exists tca_write on public.teacher_class_attendance;
create policy tca_write on public.teacher_class_attendance for all
  using (exists (select 1 from public.teacher_classes t where t.id = class_id and (public.is_admin() or (t.author = auth.uid() and public.is_wave_staff(t.wave_id, 'profesor')))))
  with check (exists (select 1 from public.teacher_classes t join public.candidates c on c.id = candidate_id
    where t.id = class_id and c.wave_id = t.wave_id and (public.is_admin() or (t.author = auth.uid() and public.is_wave_staff(t.wave_id, 'profesor')))));

drop trigger if exists tc_touch on public.teacher_classes;
create trigger tc_touch before update on public.teacher_classes for each row execute function public.touch_updated_at();
