-- "Crear cuenta": la persona pide acceso indicando su rol; el admin aprueba y asigna el rol definitivo (re-ejecutable).
alter table public.access_requests add column if not exists kind text not null default 'SPECIAL';
alter table public.access_requests add column if not exists requested_role text;
alter table public.access_requests add column if not exists granted_role text;
alter table public.access_requests drop constraint if exists access_requests_kind_check;
alter table public.access_requests add constraint access_requests_kind_check check (kind in ('SPECIAL', 'ACCOUNT'));
alter table public.access_requests drop constraint if exists access_requests_reason_check;
alter table public.access_requests add constraint access_requests_reason_check check (reason in ('RETOMA', 'WAVE_ANTERIOR', 'HISTORICO', 'MIGRACION', 'OTRO', 'CUENTA'));
-- En una solicitud de cuenta el detalle es opcional.
alter table public.access_requests drop constraint if exists access_requests_description_check;
alter table public.access_requests add constraint access_requests_description_check check (char_length(description) <= 2000);
alter table public.access_requests drop constraint if exists access_requests_requested_role_check;
alter table public.access_requests add constraint access_requests_requested_role_check check (requested_role is null or requested_role in ('kiber', 'delivery', 'bp', 'mentor', 'hub', 'admin'));
