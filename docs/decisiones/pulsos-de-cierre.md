# Decisión de producto: pulsos de cierre obligatorios por etapa

**Estado:** vigente desde la versión `CIERRE-ETAPAS-2026-10-v1` · **Dueño:** Líder de Servicio AI Edge Talent

## Qué cambia

Antes, una etapa terminaba solo con sus gates académicos, y los pulsos eran opcionales y llegaban *después* de avanzar.
Ahora cada etapa se cierra en este orden:

```
Requisitos académicos cumplidos → Pulso de cierre habilitado → Pulso respondido → Etapa cerrada → Siguiente etapa desbloqueada
```

Si el pulso está pendiente, la persona **no avanza**, ni siquiera con una excepción del admin.

| Etapa | Requisito académico (sin cambios) | Pulso de cierre |
|---|---|---|
| AI First Mindset | Desafío(s) evaluado(s) obligatorio(s) aprobado(s) | `MINDSET` |
| Role Enablement | AI CERT aprobada **y** verificada | `HAB_CIERRE` |
| AI Lab & Showcase | Caso presentado en el Showcase | `LAB` |
| Cierre | — | `FINAL` (cierra el journey) |

Assessment no tiene pulso: se cierra con la inscripción. Los requisitos académicos **no cambiaron**: el pulso se
suma a ellos y no los reemplaza (ver `lib/journey/rules.ts → advanceGate`).

## Las cinco preguntas base (obligatorias en todo pulso de cierre)

1. Satisfacción con la etapa (1 a 5)
2. ¿Qué aprendiste?
3. ¿Qué fue lo más valioso?
4. ¿Qué podríamos mejorar? (se acepta «Nada por ahora»)
5. ¿Cómo vas a aplicarlo en tu trabajo?

Cada pulso conserva además su bloque propio, que alimenta los indicadores que ya existían (calidad y NPS de Mindset,
ICAA/GPC/TAE/TIIC de habilitación, NPS del Lab, eficiencia pre/post del pulso final).

**Experiencia declarada ≠ adopción.** Lo que la persona dice que aprendió o aplicará es una señal de experiencia. La
adopción se mide con evidencia: certificación verificada, avance en la plataforma AI CERT, casos presentados y
horas pre/post. Los informes las muestran por separado.

## Excepciones

- El admin puede dar por cumplidos los requisitos académicos con una nota (queda en `stage_closures.requirements_by_exception`,
  `exception_note` y en `audit_log`). Eso **habilita** el pulso; la etapa se cierra sola cuando la persona responde.
- Quien avanzó de etapa antes de esta regla puede responder el pulso que le faltó; no se le bloquea retroactivamente.

## Dónde vive

- Reglas puras: `lib/journey/closure.ts` (tests en `tests/cierre.test.ts`).
- Motor con datos: `lib/journey/closure-sync.ts → syncStageClosure`. Se ejecuta al responder un pulso, al revisar una
  entrega o una certificación, al registrar el Showcase y cuando el admin avanza etapas. Es idempotente: el avance usa
  `journey_layer = <actual>` como condición y los eventos (`stage.requirements.met`, `stage.closed`, `stage.unlocked`)
  llevan clave única.
- Consentimiento de reglas: la persona confirma «Entiendo cómo funciona el cierre de cada etapa» una vez; queda en
  `consents` con la versión. Si el texto cambia, se sube la versión.

## Quién ve las respuestas

El equipo de AI Edge Talent (admin). El Delivery ve un resumen de experiencia solo de las personas que tiene asignadas y
solo si el Líder de Servicio comparte el informe de la Wave. Las respuestas no afectan evaluaciones.
