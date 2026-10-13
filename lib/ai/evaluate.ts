import "server-only";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { EvaluationError, EvaluationSchema, SYSTEM_PROMPT, buildUserMessage, normalizeEvaluation, scoreEvaluation, type Evaluation } from "./rubric";
import { AI_MODEL, aiConfigured, anthropic as client } from "./client";

export const EVALUATION_MODEL = AI_MODEL;

function anthropic() {
  if (!aiConfigured()) throw new EvaluationError("Falta ANTHROPIC_API_KEY en el servidor.");
  return client();
}

/**
 * Evalúa una postulación. Devuelve la propuesta (puntajes por dimensión + total/nivel calculados en código).
 * - Salida estructurada validada con Zod.
 * - La rúbrica (system) se cachea: es idéntica para todas las postulaciones de la Wave.
 * - fallbacks "default": si el modelo declina por política, la API reintenta en el modelo recomendado.
 */
export async function evaluateApplication(input: Parameters<typeof buildUserMessage>[0]) {
  const response = await anthropic().beta.messages.parse({
    model: EVALUATION_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: betaZodOutputFormat(EvaluationSchema) },
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: buildUserMessage(input) }],
  });

  if (response.stop_reason === "refusal") {
    throw new EvaluationError("El modelo no pudo evaluar esta postulación. Requiere revisión humana.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new EvaluationError("La evaluación quedó incompleta. Intenta nuevamente.");
  }
  const raw = response.parsed_output as Evaluation | null;
  if (!raw) throw new EvaluationError("La respuesta del modelo no tuvo el formato esperado.");
  const parsed = normalizeEvaluation(raw);
  const scored = scoreEvaluation(parsed);
  return { evaluation: parsed, ...scored, model: response.model };
}
