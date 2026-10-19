-- Ventana de postulación administrable por Wave: inicio opcional y cierre (application_deadline, ya existente),
-- y si la fecha de cierre se muestra o no a los postulantes. Re-ejecutable.
alter table public.waves add column if not exists application_opens_at timestamptz;
alter table public.waves add column if not exists application_deadline_hidden boolean not null default false;
