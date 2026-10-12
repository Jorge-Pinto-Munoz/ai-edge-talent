# AET Platform

Plataforma del ciclo completo **AI Edge Talent** (Kibernum):

Preparación de Wave → Cliente habilitado → Nominación → Invitación → Postulación → Assessment → Selección → Aceptación de condiciones → Inscripción → Mindset → AI CERTs → AI Lab → Showcase → Cierre → Adopción piloto.

> **Estado: demo funcional.** Los datos viven en el navegador (localStorage). No hay autenticación: la “Vista demo” del encabezado cambia el rol. Clientes, Delivery y participantes son ficticios.

## Ejecutar

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # reglas de dominio (vitest)
npm run build      # build de producción + typecheck
```

El botón ↺ del encabezado restablece los datos demo.

## Rutas

| Ruta | Para | Qué hace |
|---|---|---|
| `/programa` | Todos | Portal permanente: las 22 preguntas del programa + FAQ |
| `/ayuda` | Todos | FAQ por rol (Kiber / Cliente / Delivery) y canales |
| `/responsabilidades` | Todos | `ResponsibilityMatrix` (RACI) |
| `/wave-3/postular` | Kiber | Landing de invitación Wave 3 → identificación → antes de postular → compromiso esperado → confirmaciones → Assessment embebido → enviado |
| `/apply/[token]` | Kiber | Invitación personal desde una nominación; explica el programa antes del formulario (“Quiero postular”) |
| `/kiber` | Kiber | Estado, qué toca ahora, qué ocurrió, registros aceptados |
| `/kiber/conditions` | Kiber | Condiciones en lenguaje simple (post-selección) |
| `/kiber/commitment` | Kiber | Carta de Compromiso versionada + aceptación explícita |
| `/kiber/bienvenida` | Kiber | “Ya eres parte de Wave 3” |
| `/kiber/onboarding` | Kiber | Wizard de 8 pasos (una vez; se puede revisar) |
| `/kiber/programa` | Kiber | Programa + acceso a onboarding, condiciones y compromiso |
| `/client/journey` | Cliente | Fases 0–9 (qué ocurre / qué esperar / qué necesitamos / qué recibirá / próximo contacto) + estado visible de sus profesionales |
| `/client/onboarding` | Cliente | Onboarding y confirmación operacional (no es contrato) |
| `/client/nominate` | Cliente | Nominación con datos mínimos (“Nominar no significa seleccionar”) |
| `/delivery/waves`, `/delivery/waves/[id]` | Delivery / PL | Wave Portfolio; detalle con readiness, nominaciones, participantes, historial, registro de resultados |
| `/delivery/playbook` | Delivery | `DeliveryStageChecklist` por etapa + `ExpectationCard`s |
| `/delivery/onboarding` | Delivery | Readiness individual READY / INCOMPLETE |
| `/admin/waves`, `/admin/waves/[id]` | Admin / PL | Crear Waves, cambiar estado, Wave Readiness Checklist, declarar WAVE READY |

## Identidad visual

Aplica el Sistema Visual AI Edge Talent (propuesta v0.2, oct 2026) y el Kit de Aplicaciones v1. Los tokens están en `app/globals.css`.

- **Paleta:** Obsidian `#080B10` · Carbon `#141B23` · Fog `#CAD6DE` · Cyan `#3DC9D4` (foco) · Magenta `#C765C0` (solo en las franjas de apertura) · Deep Teal `#1E6E78` (texto de acento en modo claro: el cyan sobre blanco no alcanza 4,5:1).
- **Modos:** expresivo (`BrandHero`, con fotografía y franjas) en Inicio, `/programa`, `/wave-3/postular`, `/apply/[token]` y bienvenida. Operativo, con superficies claras y sin efectos, en tablas, formularios y paneles.
- **Componentes:** botón cyan con texto Obsidian; secundario con contorno; radio 12; eyebrow en mayúsculas; card editorial con línea de acento (`.card.signal`); estados con etiqueta y color (Información, Aprobado, Atención, Bloqueado, Revisión humana).
- **Tipografía:** Gilroy (Light 300, Regular 400 + Italic, Medium 500, SemiBold 600, Bold 700, ExtraBold 800) servida desde `public/fonts/` en WOFF, con `font-display: swap` y precarga de Regular y Bold. Fallback: `"Liberation Sans", Arial`. Gilroy es una fuente licenciada: mantener el repositorio privado o confirmar que la licencia de Kibernum cubre su uso web antes de publicar.
- **Activos:** logos oficiales KIBERNUM 2.0 en `public/brand/`: `kibernum-blanco.svg` (negativo, sobre oscuro), `kibernum-positivo.svg` (Graphite `#282828`, sobre claro; se usa en la cabecera de documentos) y `kibernum-isotipo.svg`. El favicon (`app/icon.svg`) es el isotipo, que cambia a blanco en tema oscuro. Las fotografías de `public/images/` son referencias generadas e ilustrativas: no son participantes reales ni evidencia de resultados, y así se rotulan en pantalla.
- **Paleta corporativa Kibernum 2.0:** verde `#B2D5AD` y lavanda `#B9AAD4` se usan en los estados Aprobado y Revisión humana, siempre con texto Obsidian.
- **Movimiento:** franjas con desplazamiento breve (≤ 900 ms) solo en aperturas; transiciones de 150–250 ms; respeta `prefers-reduced-motion`.


## Fase 1 · Admisión real (Supabase)

Con Supabase configurado, la app deja de ser solo demo para la admisión:

- **Login sin contraseña** (`/login`): enlace mágico al correo. El rol se asigna en `/admin/accesos` (admin · delivery · cliente · kiber). Quien ingresa sin rol asignado queda como Kiber.
- **Portal de admisión** (`/admin/admision`):
  - por cada Wave: candidatos, importación de la base (CSV de Excel o Monday) y filtros;
  - selección múltiple y acciones masivas: **Evaluar con IA**, **Registrar decisión** y **Enviar correo**;
  - detalle por candidato: respuestas, propuesta de la IA por dimensión, historial, decisiones, compromiso y correos.
- **Postulación propia, sin Typeform** (`/postular/registro` y `/postular/[token]`):
  - la persona se identifica y recibe su enlace personal por correo;
  - ve qué se espera de ella, confirma cada punto y responde el Assessment, con borrador automático;
  - al enviar, la IA la evalúa de inmediato.
- **Selección y compromiso:** si es seleccionada, acepta la Carta de Compromiso en su mismo enlace y queda inscrita. Cada paso queda registrado.

### Reglas que aplica la base de datos (RLS)
- **Evaluación IA y decisiones:** solo **admin** las ve. Delivery ve el estado del candidato, no puntajes. El cliente ve solo la vista agregada de su propio cliente. El Kiber ve solo su registro.
- **La IA propone, una persona decide:** `decisions` guarda quién decidió, si coincidió con la IA y la nota. Es append-only (sin UPDATE ni DELETE).
- **Historial y compromiso:** `admission_events` registra cada cambio de estado. En `commitment_acceptances` la versión es inmutable, `accepted_at` lo pone la base (sin aceptación retroactiva) y una versión nueva marca la anterior como `SUPERSEDED`.
- **Rúbrica:** la del skill AET (1–5 por dimensión; total = Σ(puntaje × peso)/5×100; niveles A/B/C/D). Corte en 50: bajo el corte, la propuesta es repechaje por video, no descarte. Con evidencia insuficiente, la propuesta es revisión humana. El total lo calcula el código, no el modelo.
- **Correos:** nunca incluyen puntajes ni ranking. Todo envío queda registrado en `email_messages`.

### Configurar (una vez)
1. **Base de datos:** en Supabase → SQL Editor, ejecuta `supabase/migrations/20261012000000_admision.sql` y luego `supabase/seed.sql`. Con la CLI, `supabase db push` hace lo mismo.
2. **Auth:** en Authentication → URL Configuration, define la Site URL con la URL pública de la app y agrega `https://TU-APP/auth/callback` en Redirect URLs.
3. **Primer admin:** ejecuta en SQL: `insert into role_grants (email, role) values ('tu.correo@kibernum.com', 'admin');`. Luego ingresa por `/login`.
4. **Variables de entorno** (ver `.env.example`): configúralas en el hosting (Vercel u otro) o en `.env.local`, nunca en el repositorio. Sin `ANTHROPIC_API_KEY` no hay evaluación IA. Sin `RESEND_*` los correos quedan registrados como fallidos.
5. **Preguntas del formulario:** el seed carga las 9 preguntas del formulario AET estándar. Product Lead debe validarlas antes de abrir la postulación.

### Pruebas
- `npm test`: reglas de dominio, rúbrica (incluye los ejemplos de calibración del skill), importación CSV, correos y caminos de estado.
- `npm run test:db`: aplica la migración en un Postgres local y verifica RLS por rol, append-only y compromiso.
- **Prueba de punta a punta:** el flujo completo se probó contra una base local con GoTrue + PostgREST, los mismos componentes de Supabase. Cubre autoinscripción → confirmación → Assessment → envío → decisión del admin → correo → aceptación de compromiso → inscrito. La evaluación IA y Resend no se probaron con servicios reales: este ambiente no tiene claves.

### Pendiente de esta fase
- **Video de repechaje:** hoy el candidato lo envía a su Delivery. La carga del video en la plataforma llega con el almacenamiento de la Fase 2.
- **Borrado de candidatos:** el historial es append-only, así que borrar un candidato también falla. Si se necesita un procedimiento de eliminación de datos personales, hay que definirlo explícitamente.


## Fase 2 · Journey (Supabase)

Capas del framework AET: **Assessment → AI Mindset → Role Enablement → AI Lab & Showcase → Cierre**.

| Ruta | Para | Qué hace |
|---|---|---|
| `/inicio` | Todos | Tras el login, cada rol llega a su espacio |
| `/mi-journey` | Kiber | Dónde estoy, qué pasó, qué viene; video de cada etapa; cápsulas de la etapa actual; registro de la certificación AI CERT |
| `/mi-journey/capsula/[id]` | Kiber | Video, material descargable, “Vi esta cápsula” y entrega de la tarea (texto + archivos) con intentos y feedback |
| `/admin/contenido/[waveId]` | Admin | Video explicativo por etapa (enlace o archivo) y micro-cápsulas: video, materiales, tarea, obligatoriedad, máximo de intentos, plazo, publicación |
| `/admin/journey/[waveId]` | Admin / Delivery | Participantes por etapa y avance con gates · revisión de entregas · verificación de certificaciones · grupos y mentores · feedback semanal por semana |
| `/mentor` | Mentor | Feedback semanal de cada persona de sus grupos (asistencia, avance, riesgo, comentario) y del curso/acompañamiento |
| `/cliente` | Cliente | Vista general por Wave: cuántos de sus profesionales hay en cada etapa y en qué va cada uno (sin puntajes) |

**Reglas que aplica el sistema**
- **Gates:**
  - para AI Mindset se requiere inscripción;
  - para Role Enablement, todas las tareas **obligatorias** de Mindset aprobadas;
  - para AI Lab, la certificación AI CERT **aprobada y verificada**.
  - Sin cumplir un gate, solo se avanza con una **nota de excepción**, que queda en `journey_events` (append-only).
- **Intentos de tarea:** se configuran por cápsula (por defecto 2 en Mindset). “Revisión humana” no consume intento. Con una entrega en revisión no se puede reenviar. AI Lab no tiene máximo.
- **AI CERT:** Kibernum financia hasta dos intentos. La plataforma lo explica y registra cada intento.
- **Feedback semanal:** semana de lunes a domingo (hora de Chile), editable durante la semana. El mentor solo puede escribir sobre personas de **sus** grupos (la base lo bloquea aunque se intente con el id de otra persona). El Kiber y el cliente no lo ven.
- **Archivos:** quedan en buckets **privados** (`content`, `submissions`, `certificates`). El servidor valida permisos y entrega URLs firmadas de 10 minutos para subir o ver.
- **Enlace personal de postulación (`invite_token`):** ningún usuario autenticado puede leerlo por la API (permiso de columna), ni siquiera el admin desde el navegador.

**Configurar (además de la Fase 1)**
1. Ejecuta en orden `supabase/migrations/20261013000000_mentor_role.sql` y luego `20261013000100_journey.sql`. Van en archivos separados porque el rol `mentor` debe existir antes de usarse.
2. **Tamaño de archivos:** el límite de Storage depende del plan de Supabase (en el plan gratuito, 50 MB por archivo). Para videos largos conviene un enlace (YouTube no listado, Vimeo o Stream). La plataforma acepta ambos.
3. **Mentores:** asígnalos por correo desde *Grupos y mentores*. Si aún no han ingresado, quedan habilitados con rol mentor y luego se asignan al grupo.

**Probado** contra un stack local con GoTrue + PostgREST + Storage (ver `tests/e2e/`). El recorrido completo pasa:
1. contenido → inicio de Mindset → el gate bloquea sin aprobación;
2. entrega con archivo → revisión → Role Enablement;
3. grupo y mentor → feedback semanal;
4. certificación → verificación → AI Lab;
5. vista del cliente; el cliente es rechazado en el portal admin.

## Fase 3 · Talento y alumni (Supabase)

Una **ficha de talento por persona** (por correo) que la acompaña en todas sus Waves. Se crea sola cuando la persona entra como candidata (importación, nominación, autopostulación o carga histórica).

**Rutas (solo admin y Delivery)**

| Ruta | Para qué |
|---|---|
| `/admin/talento` | Pool de talento. Muestra indicadores: personas, en servicio, High Talent, completaron, % de retención y seguimientos vencidos. Tiene clusters por especialidad (Ingeniería, Calidad, Agilidad, Datos, Otro), filtros (Wave, estado de servicio, High Talent, completaron) y descarga en CSV. |
| `/admin/talento/[id]` | Ficha de una persona: recorrido por Wave, historial de servicio, estado de servicio, High Talent, datos de la ficha y seguimiento post-habilitación. |
| `/admin/talento/importar` | Solo admin. Carga participantes de Waves pasadas desde un CSV con estas columnas: `Nombre; Correo; Wave; Cliente; Rol; Especialidad; Resultado; Estado servicio`. La Wave 1 y la Wave 2 ya existen como Waves cerradas. |

**Reglas**
- **Estado de servicio:** *En servicio*, *Banca* o *Salió de Kibernum*.
  - Marcar una salida exige el motivo.
  - Cada cambio queda en un historial que no se puede editar ni borrar, con quién lo hizo y desde cuándo.
- **High Talent:** solo un admin lo marca o lo quita, y debe dejar la evidencia. La base de datos lo bloquea aunque Delivery lo intente por la API.
- **Seguimiento post-habilitación:**
  - *Mes 1* (+30 días) mide percepción y adopción.
  - *Mes 3* (+90 días) mide el impacto real.
  - Se cuenta desde la fecha de cierre de la Wave o del Showcase.
  - Se registra la adopción de IA (1–5), si la persona sigue usando IA, la evidencia de impacto, la percepción del cliente y el próximo paso.
- **Retención:** % de quienes completaron el programa y siguen en servicio o en banca.
- **Quién ve esta capa:** los clientes, los mentores y los Kibers **no** la ven, y el CSV no incluye puntajes.

**Configurar:** ejecuta `supabase/migrations/20261014000000_talento.sql` en el SQL Editor, después de las migraciones anteriores. Pega el archivo completo, sin selección. El script:
- se puede volver a ejecutar sin problema;
- enlaza solo a los candidatos que ya existen.

**Probado** contra el stack local (`tests/e2e/`), con este recorrido:
1. Carga histórica (incluye a una persona que ya estaba en la Wave 3, que queda con 2 Waves en una sola ficha).
2. Clusters y filtros, y descarga del CSV.
3. High Talent y salida con motivo.
4. Programar el Mes 1 y el Mes 3, y registrar el Mes 1.
5. Delivery reactiva a la persona, pero no puede marcar High Talent ni importar.
6. Vista móvil sin scroll horizontal.

## Próximas fases (acordadas)
- **Fase 2 · Journey:** hecha (ver arriba). Quedan abiertos:
  - correos automáticos al cambiar de etapa o al recibir feedback de una entrega (hoy el Kiber lo ve en su portal);
  - carga del video de repechaje en la plataforma;
  - evaluación asistida por IA de las entregas de Mindset (hoy la revisión es humana);
  - copiar el contenido de una Wave a la siguiente.
- **Fase 3 · Talento y alumni:** hecha (ver arriba). Queda abierto:
  - recordatorio por correo cuando vence un seguimiento;
  - vista agregada de adopción e impacto por Wave y por cliente.

## Arquitectura

```
lib/domain/      Reglas puras y testeadas
  types.ts         WaveStatus ≠ AdmissionStatus ≠ JourneyStage (tres ejes separados)
  admission.ts     Máquina de estados de admisión + proyección visible para el cliente
  acceptance.ts    Acknowledgement y CommitmentAcceptance (versionado, sin sobreescritura)
  wave.ts          Readiness, WAVE READY (solo Product Lead), riesgos, salud, data quality
lib/data/        Contenido del producto (fuente única)
  journey.ts       Ciclo completo con "track"; alimenta ExpectationCard, playbook y portal
  raci.ts          Solo responsabilidades definidas; el resto se muestra PENDIENTE DE DEFINICIÓN
  playbook.ts, program.ts, readiness.ts, waves.ts, seed.ts
content/documents.json   Textos versionados (confirmación previa, Carta de Compromiso, condiciones)
lib/store/       Estado de la app (acciones puras + provider con localStorage)
lib/integrations/monday.ts   Outbox para sincronizar con Monday (adaptador nulo por ahora)
```

### Reglas que el código hace cumplir

- **Postular ≠ seleccionado ≠ inscrito.** `ENROLLED` solo se alcanza desde `CONDITIONS_ACCEPTED`. `SELECTED`, `CONDITIONS_ACCEPTED` y `ENROLLED` quedan como eventos separados.
- **Confirmación previa ≠ Carta de Compromiso.** El Assessment no se habilita sin las 7 confirmaciones individuales, todas sin marcar al inicio. La Carta solo se presenta a personas seleccionadas.
- **Versionado.** Cada aceptación guarda `documentVersion` y `conditionsVersion`. Una versión nueva marca la anterior como `SUPERSEDED` y conserva quién la aceptó y cuándo. `acceptedAt` lo fija el sistema, así que no hay aceptación retroactiva.
- **WAVE READY** lo declara solo Product Lead, con el checklist completo. Sin él no se abren nominaciones ni se activa la Wave.
- **El cliente** ve estados agregados (pendiente / completada / avanza / no avanza / rescate). Nunca ve puntajes ni ranking. El outbox hacia Monday tampoco transporta la evaluación.
- **Deadline Wave 3** (viernes 16 de octubre de 2026, 12:00 hrs Chile): después de esa hora no se aceptan nuevas postulaciones.

### Cambiar textos sin tocar código

Edita `content/documents.json`. Para publicar una versión nueva, agrega el documento con otro `version` y apunta a él en `rules` de la Wave (`lib/data/waves.ts`, o el backend cuando exista). Las aceptaciones anteriores se conservan con su versión.

### Assessment (Typeform)

Se embebe `https://7u2ygbjsecs.typeform.com/to/N0Gb47Ge` con `@typeform/embed`, pasando solo `applicationId` y `waveId` como hidden fields. Para que lleguen a las respuestas, el formulario debe tener esos hidden fields configurados en Typeform. El submit se detecta con `onSubmit` y pasa la postulación a `APPLICATION_SUBMITTED`. Si el embed no carga en 12 s, aparece el aviso. El enlace “Abrir Assessment en una nueva pestaña” siempre está disponible, con confirmación manual del envío.

## Pendiente / decisiones abiertas

- **Textos en BORRADOR:** la Carta de Compromiso, las condiciones y la confirmación previa requieren aprobación de Product Lead y, si corresponde, de Legal/People.
- **Backend, autenticación e integración Monday:** hoy la persistencia es local. El outbox deja preparado el contrato de sincronización para que la plataforma no sea una segunda verdad operacional.
- **Metadata de sesión/IP** en aceptaciones: deshabilitada hasta validar la regulación aplicable.
- **Datos sin cargar** (se muestran como “Sin dato”, nunca inventados): fechas de inicio y cierre de Wave 3, Wave Lead, cohort objetivo, canales de soporte, datos históricos de Waves 1 y 2.
- **RACI:** las celdas sin responsabilidad canónica muestran PENDIENTE DE DEFINICIÓN.
- **Checklist de Wave 3:** viene marcado como completo y declarado (estado demo) para que la nominación funcione. Hay que confirmarlo contra la realidad.
- **Mecánica del video de rescate:** el estado `RESCUE_REQUIRED` y su comunicación existen. La carga del video no.
- **Dependencias:** `npm audit` reporta advisories en el postcss que trae Next 15.5 y en tinypool (dev, vía vitest). Revisar al actualizar a Next 16 / Vitest 4+.
