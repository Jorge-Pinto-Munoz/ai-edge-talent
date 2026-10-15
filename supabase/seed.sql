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

-- ═══════════════ Demostración (ficticia) ═══════════════
-- Wave Demo con dos profesionales inventados para ver la plataforma como ellos:
--   * Valentina Demo Rojas: postuló, quedó seleccionada, aceptó su compromiso, cerró AI First Mindset y va en Role Enablement.
--   * Tomás Demo Fuentes: postuló y no quedó seleccionado (queda en la banca).
-- Ingresan con correo + código personal (dominio .invalid: nunca recibe correo). Son cuentas de solo lectura
-- (lib/identity/demo.ts) y no cuentan en las cifras públicas. Se crea una sola vez; borrar la Wave Demo y estas
-- cuentas no afecta a nadie más.
do $demo$
declare
  va uuid := '0d000000-0000-4000-8000-00000000a001';  -- Valentina (usuario)
  tb uuid := '0d000000-0000-4000-8000-00000000b001';  -- Tomás (usuario)
  ca uuid := '0d000000-0000-4000-8000-00000000a002';  -- candidatos
  cb uuid := '0d000000-0000-4000-8000-00000000b002';
  aa uuid := '0d000000-0000-4000-8000-00000000a003';  -- postulaciones
  ab uuid := '0d000000-0000-4000-8000-00000000b003';
  ea uuid := '0d000000-0000-4000-8000-00000000a004';  -- evaluaciones IA
  eb uuid := '0d000000-0000-4000-8000-00000000b004';
  k1 uuid := '0d000000-0000-4000-8000-00000000c001';  -- cápsulas de Mindset
  k2 uuid := '0d000000-0000-4000-8000-00000000c002';
  judge uuid;
  col text;
  u record;
begin
  if exists (select 1 from public.candidates where id = ca) then return; end if;

  insert into public.waves (id, name, status, application_deadline, rules_version, conditions_version, commitment_version, acknowledgement_version, start_date, estimated_close_date)
  values ('wave-demo', 'AI Edge Talent · Wave Demo (ficticia)', 'CLOSED', '2026-09-04T12:00:00-03:00', 'AET-RULES-W3', 'COND-W3-0.1-BORRADOR', 'CC-W3-0.1-BORRADOR', 'ACK-W3-1.0', '2026-09-07', '2026-11-30')
  on conflict (id) do nothing;
  insert into public.application_questions (wave_id, position, prompt, help, kind, options)
  select 'wave-demo', position, prompt, help, kind, options from public.application_questions where wave_id = 'wave-3'
  on conflict (wave_id, position) do nothing;

  -- Cuentas (auth). Columnas de texto que GoTrue lee como string: vacías si existen en esta versión.
  for u in select * from (values (va, 'valentina.demo@demo-aet.invalid', 'Valentina Demo Rojas'), (tb, 'tomas.demo@demo-aet.invalid', 'Tomás Demo Fuentes')) as x(id, email, name) loop
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, '', now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', u.name), now(), now())
    on conflict (id) do nothing;
    foreach col in array array['confirmation_token', 'recovery_token', 'email_change_token_new', 'email_change_token_current', 'email_change', 'phone_change', 'phone_change_token', 'reauthentication_token'] loop
      if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = col) then
        execute format('update auth.users set %I = coalesce(%I, %L) where id = %L', col, col, '', u.id);
      end if;
    end loop;
    if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'identities' and column_name = 'provider_id') then
      execute 'insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at) values ($1, $2, $3, ''email'', now(), now()) on conflict do nothing'
        using u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true);
    else
      execute 'insert into auth.identities (id, user_id, identity_data, provider, created_at, updated_at) values ($1, $2, $3, ''email'', now(), now()) on conflict do nothing'
        using u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email);
    end if;
    -- El perfil lo crea el trigger de auth.users; se asegura por si la versión no lo dispara.
    insert into public.profiles (id, email, full_name, role) values (u.id, u.email, u.name, 'kiber') on conflict (id) do nothing;
    update public.profiles set full_name = u.name, role = 'kiber', status = 'ACTIVE' where id = u.id;
  end loop;
  -- Códigos personales: Valentina 2847 · Tomás 5163 (solo el hash scrypt).
  insert into public.user_credentials (user_id, pin_hash, pin_set_at, must_change) values
    (va, 'scrypt$16384$OjqMtOx3ZPaTbwkpSk9QEA==$9Jg2vTbz1IT+Oz+mhFuq5wgYveRjN/lR1O8Xek0fgHU=', now(), false),
    (tb, 'scrypt$16384$P7T2ERU2UscWBGPYniO6Ww==$XZy8eQiSWxLyBYvruRpSJyQelOTNvBU7ekR/eCo0EJ0=', now(), false)
  on conflict (user_id) do nothing;

  -- Postulaciones
  insert into public.candidates (id, wave_id, full_name, corporate_email, client_name, role_title, specialty, delivery_owner, source, status, user_id, journey_layer, journey_layer_since, phone)
  values
    (ca, 'wave-demo', 'Valentina Demo Rojas', 'valentina.demo@demo-aet.invalid', 'Cliente Demo Andes', 'Analista QA', 'Calidad', 'Delivery Demo', 'demo', 'MINDSET_READY', va, 'ROLE_ENABLEMENT', now() - interval '9 days', '+56911111111'),
    (cb, 'wave-demo', 'Tomás Demo Fuentes', 'tomas.demo@demo-aet.invalid', 'Cliente Demo Pacífico', 'Desarrollador Backend', 'Ingeniería', 'Delivery Demo', 'demo', 'NOT_SELECTED', tb, null, null, '+56922222222');

  insert into public.applications (id, candidate_id, answers, questions_snapshot, started_at, submitted_at)
  select aa, ca, jsonb_object_agg(q.id, a.txt), jsonb_agg(jsonb_build_object('id', q.id, 'position', q.position, 'prompt', q.prompt) order by q.position), now() - interval '40 days', now() - interval '39 days'
  from public.application_questions q join (values
    (1, 'Diseño casos de prueba, automatizo regresiones con Cypress y reporto defectos al equipo de desarrollo cada sprint.'),
    (2, 'A diario'),
    (3, 'Usé un asistente de IA para generar casos de prueba desde las historias de usuario; revisé y ajusté cada uno, y bajamos de 6 a 2 horas la preparación de cada sprint.'),
    (4, 'Pasaré menos tiempo escribiendo pruebas repetitivas y más diseñando estrategias de calidad y revisando lo que propone la IA.'),
    (5, 'Sigo la comunidad de testing con IA y un newsletter semanal; me sirven para probar herramientas nuevas con criterio.'),
    (6, 'Incorporé la IA para redactar reportes de defectos y dejé de escribir a mano los datos de prueba.'),
    (7, 'El análisis de logs cuando falla una regresión: toma horas encontrar la causa.'),
    (8, 'La generación de datos de prueba y el primer borrador de los casos.'),
    (9, 'Volvería a tardar el triple en preparar cada sprint.')
  ) as a(pos, txt) on a.pos = q.position where q.wave_id = 'wave-demo';
  insert into public.applications (id, candidate_id, answers, questions_snapshot, started_at, submitted_at)
  select ab, cb, jsonb_object_agg(q.id, a.txt), jsonb_agg(jsonb_build_object('id', q.id, 'position', q.position, 'prompt', q.prompt) order by q.position), now() - interval '41 days', now() - interval '39 days'
  from public.application_questions q join (values
    (1, 'Desarrollo servicios y corrijo errores.'),
    (2, 'Ocasionalmente'),
    (3, 'Una vez le pedí a un chat que me explicara un error.'),
    (4, 'No estoy seguro.'),
    (5, 'Ninguno en particular.'),
    (6, 'Lo probé un par de veces.'),
    (7, 'Las reuniones largas.'),
    (8, 'Aún no lo sé.'),
    (9, 'Nada, casi no la uso.')
  ) as a(pos, txt) on a.pos = q.position where q.wave_id = 'wave-demo';

  insert into public.ai_evaluations (id, application_id, model, rubric_version, scores, weighted_total, level, recommendation, summary, risks, created_at) values
  (ea, aa, 'demo', 'AET-RUBRIC-1', '{
    "real_use": {"score": 5, "evidence": "bajamos de 6 a 2 horas la preparación de cada sprint", "justification": "Uso cotidiano con resultado medible."},
    "depth": {"score": 4, "evidence": "revisé y ajusté cada uno", "justification": "Describe problema, herramienta, método y resultado."},
    "reframe": {"score": 4, "evidence": "más diseñando estrategias de calidad", "justification": "Proyecta su rol con IA de forma concreta."},
    "autonomy": {"score": 4, "evidence": "probar herramientas nuevas con criterio", "justification": "Tiene referentes y los aplica."},
    "disposition": {"score": 5, "evidence": "Volvería a tardar el triple", "justification": "Dependencia sana y consciente."}
  }', 87.6, 'A', 'SELECTED', 'Evidencia sólida y medible de uso de IA en su trabajo de QA. Perfil ideal para la Wave.', '{}', now() - interval '38 days'),
  (eb, ab, 'demo', 'AET-RUBRIC-1', '{
    "real_use": {"score": 2, "evidence": "Una vez le pedí a un chat que me explicara un error.", "justification": "Uso esporádico, sin práctica sostenida."},
    "depth": {"score": 1, "evidence": null, "justification": "No describe un caso con método ni resultado."},
    "reframe": {"score": 2, "evidence": "No estoy seguro.", "justification": "Aún no proyecta cambios en su rol."},
    "autonomy": {"score": 1, "evidence": "Ninguno en particular.", "justification": "Sin aprendizaje autónomo declarado."},
    "disposition": {"score": 3, "evidence": "Lo probé un par de veces.", "justification": "Disposición inicial, sin uso sostenido."}
  }', 33.6, 'D', 'NOT_SELECTED', 'Uso de IA todavía exploratorio. Se recomienda prepararse para una próxima Wave.', '{"Sin caso concreto"}', now() - interval '38 days');

  -- Decisión humana (la registra el primer admin activo; si aún no hay, queda solo la propuesta de IA).
  select id into judge from public.profiles where role = 'admin' and status = 'ACTIVE' order by created_at limit 1;
  if judge is not null then
    insert into public.decisions (candidate_id, outcome, ai_evaluation_id, agrees_with_ai, note, decided_by, decided_at) values
      (ca, 'SELECTED', ea, true, 'Ficticio: evidencia clara de uso real.', judge, now() - interval '37 days'),
      (cb, 'NOT_SELECTED', eb, true, 'Ficticio: queda en la banca para una próxima Wave.', judge, now() - interval '37 days');
  end if;

  insert into public.admission_events (candidate_id, from_status, to_status, actor_label, note, at) values
    (ca, null, 'APPLICATION_STARTED', 'Demo', null, now() - interval '40 days'),
    (ca, 'APPLICATION_STARTED', 'APPLICATION_SUBMITTED', 'Demo', null, now() - interval '39 days'),
    (ca, 'APPLICATION_SUBMITTED', 'ASSESSMENT_EVALUATED', 'Demo', null, now() - interval '38 days'),
    (ca, 'ASSESSMENT_EVALUATED', 'SELECTED', 'Demo', null, now() - interval '37 days'),
    (ca, 'SELECTED', 'CONDITIONS_ACCEPTED', 'Demo', null, now() - interval '35 days'),
    (ca, 'CONDITIONS_ACCEPTED', 'ENROLLED', 'Demo', null, now() - interval '35 days'),
    (ca, 'ENROLLED', 'MINDSET_READY', 'Demo', null, now() - interval '30 days'),
    (cb, null, 'APPLICATION_STARTED', 'Demo', null, now() - interval '41 days'),
    (cb, 'APPLICATION_STARTED', 'APPLICATION_SUBMITTED', 'Demo', null, now() - interval '39 days'),
    (cb, 'APPLICATION_SUBMITTED', 'ASSESSMENT_EVALUATED', 'Demo', null, now() - interval '38 days'),
    (cb, 'ASSESSMENT_EVALUATED', 'NOT_SELECTED', 'Demo', null, now() - interval '37 days');
  insert into public.commitment_acceptances (candidate_id, wave_id, document_version, conditions_version, status, presented_at, accepted_at, accepted_by)
  values (ca, 'wave-demo', 'CC-W3-0.1-BORRADOR', 'COND-W3-0.1-BORRADOR', 'ACCEPTED', now() - interval '36 days', now() - interval '35 days', 'valentina.demo@demo-aet.invalid');

  -- Journey de Valentina: AI First Mindset cerrada (desafío aprobado + pulso de cierre) y Role Enablement en curso.
  insert into public.capsules (id, wave_id, layer, position, title, description, duration_min, task_prompt, task_required, max_attempts, published) values
    (k1, 'wave-demo', 'AI_MINDSET', 1, 'Qué es trabajar AI-First', 'Cápsula introductoria (contenido ficticio de demostración).', 12, null, false, null, true),
    (k2, 'wave-demo', 'AI_MINDSET', 2, 'Desafío evaluado: rediseña una actividad real', 'Elige una actividad de tu rol y rediséñala con IA, con criterio y evidencia propia.', 30,
     'Describe la actividad, cómo la rediseñaste con IA, qué revisaste tú y qué resultado obtuviste.', true, 2, true);
  insert into public.capsule_progress (candidate_id, capsule_id, completed_at) values (ca, k1, now() - interval '25 days'), (ca, k2, now() - interval '20 days');
  insert into public.submissions (candidate_id, capsule_id, attempt, text_answer, status, score, feedback, submitted_at, reviewed_at)
  values (ca, k2, 1, 'Rediseñé la preparación de casos de prueba: la IA propone casos desde cada historia y yo los reviso, priorizo y completo. Pasé de 6 a 2 horas por sprint.', 'APPROVED', 88,
          'Muy buen rediseño: el criterio de revisión está claro y el resultado es medible.', now() - interval '18 days', now() - interval '16 days');
  insert into public.journey_events (candidate_id, from_layer, to_layer, exception, note, at) values
    (ca, null, 'AI_MINDSET', false, 'Inicio del journey (demo)', now() - interval '30 days'),
    (ca, 'AI_MINDSET', 'ROLE_ENABLEMENT', false, 'Cierre de etapa: requisitos cumplidos + pulso de cierre', now() - interval '9 days');
  insert into public.pulse_responses (wave_id, pulse, respondent, user_id, candidate_id, client_name, answers, created_at) values
    ('wave-demo', 'INICIO', 'KIBER', va, ca, 'Cliente Demo Andes', '{"ai_freq": "Todos los días", "hours": 6, "tasks": "Casos de prueba y datos de prueba"}', now() - interval '29 days'),
    ('wave-demo', 'MINDSET', 'KIBER', va, ca, 'Cliente Demo Andes', '{"satisfaccion": 5, "aprendizaje": "A revisar con criterio lo que propone la IA antes de usarlo.", "valioso": "El desafío sobre un caso real de mi trabajo.", "mejorar": "Nada por ahora", "aplicacion": "Voy a generar los casos de prueba de cada sprint con IA y revisarlos.", "m_expectativas": 5, "m_ritmo": 4, "m_relevancia": 5, "m_ejemplos": 4, "m_oportunidades": 5, "m_seguridad": 4, "m_riesgos": 5, "m_materiales": 4, "m_facilitador": 5, "m_equilibrio": 4, "nps": 9}', now() - interval '9 days');
  insert into public.stage_closures (candidate_id, layer, pulse_key, requirements_met_at, pulse_submitted_at, closed_at)
  values (ca, 'AI_MINDSET', 'MINDSET', now() - interval '16 days', now() - interval '9 days', now() - interval '9 days')
  on conflict (candidate_id, layer) do nothing;
  insert into public.aicert_progress (candidate_id, intro_course, specialist_course, course, tramo, percent, note)
  values (ca, 'AI+ Prompt Engineer Level 1™', 'AI+ Quality Assurance™', 'INTRO', 3, 60, 'Avance ficticio de demostración')
  on conflict (candidate_id) do nothing;
  insert into public.consents (kind, version, text_snapshot, email, user_id, candidate_id)
  values ('STAGE_RULES', 'CIERRE-ETAPAS-2026-10-v1', 'Demo: entiende cómo funciona el cierre de cada etapa.', 'valentina.demo@demo-aet.invalid', va, ca);
end
$demo$;

-- ═══════════════ Delivery (equipo de operación) ═══════════════
-- Quedan autorizados como Delivery y asignados a Wave 3: el profesional los elige al registrarse y así se
-- vinculan de inmediato. No cambia el rol de quien ya tenga otro (p. ej. admin). Re-ejecutable.
insert into public.role_grants (email, role, full_name) values
  ('marcela.aguilera@kibernum.com', 'delivery', 'Marcela Aguilera'),
  ('mariela.villanueva@kibernum.com', 'delivery', 'Mariela Villanueva'),
  ('nathaly.amigo@kibernum.com', 'delivery', 'Nathaly Amigo'),
  ('vanessa.carrillo@kibernum.com', 'delivery', 'Vanessa Carrillo'),
  ('manuel.orellana@kibernum.com', 'delivery', 'Manuel Orellana'),
  ('bruno.bergamin@kibernum.com', 'delivery', 'Bruno Bergamin'),
  ('mdelabarra@kibernum.com', 'delivery', 'Mariela de la Barra'),
  ('rodolfo.montoya@kibernum.com', 'delivery', 'Rodolfo Montoya')
on conflict (email) do update set full_name = coalesce(public.role_grants.full_name, excluded.full_name);
-- Cuentas que ya existían como profesional por error pasan a Delivery (nunca se baja a un admin).
update public.profiles p set role = 'delivery', full_name = coalesce(p.full_name, g.full_name)
from public.role_grants g
where g.email = p.email and g.role = 'delivery' and p.role = 'kiber';
insert into public.wave_staff (wave_id, email, role)
select 'wave-3', email, 'delivery' from public.role_grants where role = 'delivery' and email like '%@kibernum.com'
on conflict do nothing;

-- ═══════════════ Administración principal ═══════════════
-- Jorge Pinto, Líder de producto: cuenta admin principal, creada una sola vez y protegida en la base (no se
-- puede degradar, pausar ni eliminar; ver 20261025000000_control_accesos.sql). Su código inicial no vive aquí:
-- el servidor lo toma del secreto ADMIN_INITIAL_CODE, lo guarda como hash y exige cambiarlo en el primer ingreso
-- (lib/identity/principal.ts). Sin ese secreto, ingresa con "Olvidé mi código" (código a su correo).
do $principal$
declare
  e text := 'jorge.pintom@kibernum.com';
  n text := 'Jorge Pinto';
  uid uuid;
  col text;
begin
  insert into public.role_grants (email, role, full_name) values (e, 'admin', n)
  on conflict (email) do update set role = 'admin', full_name = coalesce(public.role_grants.full_name, excluded.full_name);

  select id into uid from auth.users where lower(email) = e;
  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', e, '', now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', n), now(), now());
    foreach col in array array['confirmation_token', 'recovery_token', 'email_change_token_new', 'email_change_token_current', 'email_change', 'phone_change', 'phone_change_token', 'reauthentication_token'] loop
      if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = col) then
        execute format('update auth.users set %I = coalesce(%I, %L) where id = %L', col, col, '', uid);
      end if;
    end loop;
    if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'identities' and column_name = 'provider_id') then
      execute 'insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at) values ($1, $2, $3, ''email'', now(), now()) on conflict do nothing'
        using uid::text, uid, jsonb_build_object('sub', uid::text, 'email', e, 'email_verified', true);
    elsif exists (select 1 from information_schema.tables where table_schema = 'auth' and table_name = 'identities') then
      execute 'insert into auth.identities (id, user_id, identity_data, provider, created_at, updated_at) values ($1, $2, $3, ''email'', now(), now()) on conflict do nothing'
        using uid::text, uid, jsonb_build_object('sub', uid::text, 'email', e);
    end if;
  end if;

  -- El perfil lo crea el trigger (PENDIENTE hasta el primer ingreso); se asegura por si la versión no lo dispara.
  insert into public.profiles (id, email, full_name, role, status) values (uid, e, n, 'admin', 'PENDING') on conflict (id) do nothing;
  if not exists (select 1 from public.profiles where principal and id <> uid) then
    update public.profiles set role = 'admin', principal = true, full_name = coalesce(full_name, n),
      status = case when status in ('PAUSED', 'REVOKED', 'DELETED') then 'PENDING' else status end
    where id = uid and not principal;
  end if;
  insert into public.user_credentials (user_id) values (uid) on conflict (user_id) do nothing;
end $principal$;

-- Wave de demostración (ficticia): AI First Mindset abierta. Idempotente. Las Waves reales las abre Administración.
insert into public.wave_stage_openings (wave_id, layer, opens_at, notified_at)
select w.id, 'AI_MINDSET'::public.journey_layer, now(), now()
from public.waves w
where w.id = 'wave-demo'
on conflict (wave_id, layer) do nothing;
