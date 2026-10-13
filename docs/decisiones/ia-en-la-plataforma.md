# IA en la plataforma (API de Anthropic)

Todo pasa por el servidor con `ANTHROPIC_API_KEY` (nunca llega al navegador), con el SDK oficial `@anthropic-ai/sdk`,
el modelo `claude-opus-5-5` (`lib/ai/client.ts`) y salida estructurada validada con Zod. Si la llave no está
configurada, cada función cae a su camino sin IA: nada se rompe.

| Dónde | Qué hace | Qué datos recibe | Quién decide |
|---|---|---|---|
| Assessment (`lib/ai/evaluate.ts`) | Propone puntajes por dimensión de la rúbrica | Respuestas de la postulación | El equipo (la IA propone; revisión humana) |
| Ayuda (`lib/ai/help.ts`) | Responde preguntas escritas que no calzan con una respuesta preparada | La pregunta y el contenido oficial del sitio | Si la información oficial no alcanza, deriva al equipo |
| Avance y experiencia (`lib/ai/pulse-summary.ts`) | Agrupa en temas los textos de los pulsos de cierre por etapa | Textos **sin nombres**; mínimo 3 respuestas | El admin la genera a pedido; se lee junto a las respuestas |

## Límites y costos

- Ayuda: 8 preguntas por red por hora y 400 respuestas de IA por día en total; cada pregunta queda en `help_questions`
  (180 días) para mejorar las respuestas preparadas. Esfuerzo `low`.
- Síntesis de pulsos: se guarda en `ai_summaries` y solo se recalcula si llegaron respuestas nuevas. Esfuerzo `medium`.
- Todas las llamadas activan la reserva del servidor (`fallbacks: "default"`) por si el modelo declina una solicitud.

## Principios

- La IA propone o resume; las decisiones (selección, avance de etapa, excepciones) son de personas.
- La experiencia declarada no es adopción: los resúmenes lo dicen explícitamente.
- No se envían nombres ni correos a la API salvo lo que la propia persona escribe en su postulación o pregunta.

## Próximos usos posibles (no implementados)

1. Borrador de feedback del desafío de AI First Mindset, para que el revisor lo edite antes de enviarlo.
2. Resumen semanal por Delivery: quién está atrasado, qué pulsos faltan y qué decir, a partir de los datos del journey.
3. Revisión previa de la presentación del Showcase contra los criterios de evidencia de impacto.
