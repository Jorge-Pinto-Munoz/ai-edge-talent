-- Datos iniciales: Wave 3 (Reference Wave) y su formulario de postulación.
-- Las preguntas parten del formulario AET documentado en el blueprint de producto y deben ser
-- validadas por Product Lead antes de abrir la postulación (se pueden editar sin tocar código).
insert into public.waves (id, name, status, application_deadline, rules_version, conditions_version, commitment_version, acknowledgement_version)
values ('wave-3', 'AI Edge Talent · Wave 3', 'ASSESSMENT', '2026-10-16T12:00:00-03:00',
        'AET-RULES-W3', 'COND-W3-0.1-BORRADOR', 'CC-W3-0.1-BORRADOR', 'ACK-W3-1.0')
on conflict (id) do nothing;

insert into public.application_questions (wave_id, position, prompt, help, kind, options) values
('wave-3', 1, 'Describe tres tareas que realizas frecuentemente en tu rol.', 'Sé concreto/a: qué haces, con qué frecuencia y para quién.', 'long_text', null),
('wave-3', 2, '¿Con qué frecuencia usas herramientas de IA en tu trabajo?', null, 'single_choice', '["Nunca", "Ocasionalmente", "Algunas veces por semana", "A diario"]'),
('wave-3', 3, 'Describe un caso real en que hayas usado IA en tu trabajo.', 'Qué problema tenías, qué herramienta usaste, cómo lo hiciste y qué resultado obtuviste.', 'long_text', null),
('wave-3', 4, '¿Qué crees que pasará con tu rol en los próximos dos años debido a la IA?', null, 'long_text', null),
('wave-3', 5, '¿Qué referentes de IA sigues y por qué?', 'Personas, medios o comunidades, y qué te aportan para tu trabajo.', 'long_text', null),
('wave-3', 6, '¿Cómo ha sido tu comportamiento frente a la IA durante el último mes?', 'Qué probaste, qué incorporaste, qué dejaste de hacer.', 'long_text', null),
('wave-3', 7, '¿Qué problema de tu trabajo te gustaría resolver con IA?', 'Piensa en una fricción real de tu día a día con tu cliente.', 'long_text', null),
('wave-3', 8, 'Si participas, ¿qué tarea estás dispuesto/a a dejar de hacer manualmente y delegar a IA?', null, 'long_text', null),
('wave-3', 9, '¿Qué pasaría si en este momento te quitaran la IA?', null, 'long_text', null)
on conflict (wave_id, position) do nothing;
