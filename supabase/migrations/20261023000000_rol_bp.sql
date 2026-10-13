-- Rol Business Partner: lectura del área de equipo (sin escritura). Va solo en su archivo: un valor nuevo de enum
-- no se puede usar en la misma transacción en que se crea.
alter type public.app_role add value if not exists 'bp';
