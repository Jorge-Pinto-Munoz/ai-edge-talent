# AET Platform

Plataforma del ciclo completo **AI Edge Talent** (Kibernum):

Preparación de Wave → Cliente habilitado → Nominación → Invitación → Postulación → Assessment → Selección → Aceptación de condiciones → Inscripción → Mindset → AI CERTs → AI Lab → Showcase → Cierre → Adopción piloto.

> **Estado: demo funcional.** Los datos viven en el navegador (localStorage). No hay autenticación: la “Vista demo” del encabezado cambia el rol. Clientes, Delivery y participantes son ficticios.

## Ejecutar

```bash
cd aet-platform
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
