-- El rol Profesor deja de existir en la plataforma (re-ejecutable). Las cuentas que lo tenían pasan a Profesional
-- y se quitan sus asignaciones de Wave. El valor queda en el tipo app_role solo por compatibilidad de datos.
update public.profiles set role = 'kiber', updated_at = now() where role = 'profesor';
delete from public.role_grants where role = 'profesor';
delete from public.wave_staff where role = 'profesor';
