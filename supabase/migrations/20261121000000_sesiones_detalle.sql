-- AET Platform · Sesiones de Role Enablement con más detalle del profesor. Re-ejecutable.
-- Para los profesionales: horario y qué se pide para la próxima clase.
alter table public.re_sessions add column if not exists starts_at time;
alter table public.re_sessions add column if not exists ends_at time;
alter table public.re_sessions add column if not exists next_class text;
alter table public.re_sessions drop constraint if exists re_sessions_next_class_len;
alter table public.re_sessions add constraint re_sessions_next_class_len check (next_class is null or char_length(next_class) <= 2000);
-- Solo admin y profesor: intervenciones que hará en los grupos de comunicación.
alter table public.re_session_private add column if not exists interventions text;
alter table public.re_session_private drop constraint if exists re_private_interventions_len;
alter table public.re_session_private add constraint re_private_interventions_len check (interventions is null or char_length(interventions) <= 2000);
-- Evaluación del profesor a cada participante en la sesión: 1 a 3 estrellas (privada).
alter table public.re_session_attendance add column if not exists rating smallint;
alter table public.re_session_attendance drop constraint if exists re_attendance_rating_check;
alter table public.re_session_attendance add constraint re_attendance_rating_check check (rating is null or rating between 1 and 3);
