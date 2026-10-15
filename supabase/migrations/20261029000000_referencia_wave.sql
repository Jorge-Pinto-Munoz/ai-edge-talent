-- Referencia de profesionales por Wave (re-ejecutable): un indicador de planificación, NO un límite.
-- No se agrega ninguna restricción al registro ni a la selección: una Wave recibe postulaciones sin tope y el
-- Product Lead puede seleccionar más personas que la referencia.
alter table public.waves add column if not exists reference_capacity integer not null default 15;
alter table public.waves drop constraint if exists waves_reference_capacity_check;
alter table public.waves add constraint waves_reference_capacity_check check (reference_capacity between 1 and 500);
comment on column public.waves.reference_capacity is 'Referencia de profesionales seleccionados por Wave (indicador de gestión, no límite).';
