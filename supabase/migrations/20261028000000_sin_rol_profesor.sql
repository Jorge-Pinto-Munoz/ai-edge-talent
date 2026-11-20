-- Histórico (28-oct): el rol Profesor se quitó y sus cuentas pasaron a Profesional. Desde noviembre el rol volvió
-- (registra las 4 sesiones de Role Enablement), así que esta limpieza corre UNA sola vez y no se repite en cada
-- despliegue: si no, borraría a los profesores asignados después. Re-ejecutable.
do $$
begin
  if not exists (select 1 from public.app_settings where key = 'migracion_sin_rol_profesor') then
    update public.profiles set role = 'kiber', updated_at = now() where role = 'profesor';
    delete from public.role_grants where role = 'profesor';
    delete from public.wave_staff where role = 'profesor';
    insert into public.app_settings (key, value) values ('migracion_sin_rol_profesor', to_jsonb(now()));
  end if;
end $$;
