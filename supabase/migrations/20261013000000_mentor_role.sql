-- Fase 2 (1/2): rol de mentor/acompañante. Va en su propio archivo porque un valor nuevo de enum
-- no puede usarse en la misma transacción en que se crea.
alter type public.app_role add value if not exists 'mentor';
