import "server-only";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { AI_MODEL, anthropic } from "./client";

/**
 * Síntesis de los textos de un pulso de cierre: agrupa en temas lo que la gente declara haber aprendido,
 * valorado, querido mejorar y pensado aplicar. Recibe textos SIN nombres. Es experiencia declarada: no mide adopción.
 */
export const FIELDS = ["aprendizaje", "valioso", "mejorar", "aplicacion"] as const;
export type SummaryField = (typeof FIELDS)[number];

const Theme = z.object({
  theme: z.string().describe("Tema en pocas palabras, en español"),
  count: z.number().int().describe("Cuántas respuestas lo mencionan"),
  example: z.string().describe("Cita breve y textual de una respuesta, sin datos personales"),
});
export const SummarySchema = z.object({
  overview: z.string().describe("Dos o tres frases con lo principal de la etapa"),
  fields: z.array(z.object({ field: z.enum(FIELDS), themes: z.array(Theme).describe("De 1 a 5 temas, del más al menos mencionado") })),
  watch: z.array(z.string()).describe("Señales que el equipo debería revisar (molestias repetidas, bloqueos). Vacío si no hay"),
});
export type PulseSummary = z.infer<typeof SummarySchema>;

const SYSTEM = `Analizas las respuestas abiertas de un pulso de cierre de etapa del programa AI Edge Talent (Kibernum).
Agrupa en temas lo que dicen las personas en cada campo: aprendizaje (qué aprendieron), valioso (qué valoraron),
mejorar (qué mejorarían; ignora "Nada por ahora") y aplicacion (cómo lo aplicarán en su trabajo).
Reglas: usa solo lo que está en las respuestas; no inventes temas ni cantidades; las cuentas deben poder verificarse
contando respuestas; las citas deben ser textuales y cortas, sin nombres ni datos que identifiquen a alguien.
Esto es experiencia declarada: no afirmes que hubo adopción o impacto real. Escribe en español de Chile, sobrio y concreto.`;

export async function summarizePulse(stage: string, rows: Record<SummaryField, string>[]): Promise<PulseSummary> {
  const body = rows.map((r, i) => `<respuesta n="${i + 1}">\n${FIELDS.map((f) => `${f}: ${r[f] || "(vacío)"}`).join("\n")}\n</respuesta>`).join("\n");
  const res = await anthropic().beta.messages.parse({
    model: AI_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(SummarySchema) },
    system: SYSTEM,
    messages: [{ role: "user", content: `Etapa: ${stage}. ${rows.length} respuestas.\n\n${body}` }],
  });
  if (res.stop_reason === "refusal") throw new Error("El modelo no pudo resumir estas respuestas.");
  if (res.stop_reason === "max_tokens" || !res.parsed_output) throw new Error("La síntesis quedó incompleta. Intenta de nuevo.");
  return res.parsed_output;
}
