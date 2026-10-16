-- Wave 3: la postulación se extiende hasta el viernes 16 de octubre de 2026 a las 15:00 (hora de Chile).
-- Solo cambia si sigue con el plazo original (12:00), para no pisar un ajuste posterior. Re-ejecutable.
update public.waves
set application_deadline = '2026-10-16T15:00:00-03:00'
where id = 'wave-3' and application_deadline = '2026-10-16T12:00:00-03:00';
