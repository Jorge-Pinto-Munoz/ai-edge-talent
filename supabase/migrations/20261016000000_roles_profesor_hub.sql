-- Roles nuevos: profesor de certificación y líder del Hub de AI (Lab y Showcase).
-- Va en su propio archivo: un valor nuevo de enum no puede usarse en la misma transacción en que se crea.
alter type public.app_role add value if not exists 'profesor';
alter type public.app_role add value if not exists 'hub';
