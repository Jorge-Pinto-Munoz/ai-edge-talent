-- Nombre de la persona autorizada en role_grants: permite mostrar el directorio de Delivery (p. ej. en el
-- registro del profesional) antes de que la persona haya ingresado por primera vez. Re-ejecutable.
alter table public.role_grants add column if not exists full_name text;
