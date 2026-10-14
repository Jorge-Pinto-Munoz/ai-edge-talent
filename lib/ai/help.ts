import "server-only";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { HELP, type HelpAudience } from "@/lib/data/help";
import { HOME_FAQ, PUBLIC_STAGES, STAGE_GATES, WAVE3_TIMELINE } from "@/lib/data/site";
import { AI_MODEL, anthropic } from "./client";

/**
 * Asistente de Ayuda: responde SOLO con la información oficial del programa (el mismo contenido del sitio).
 * Si no está ahí, dice que no lo sabe y la persona escribe al equipo. Nunca inventa fechas, cupos ni reglas.
 */
const KNOWLEDGE = [
  "# Preguntas frecuentes",
  ...HELP.map((h) => `- [${h.aud.join("/")}] ${h.q} → ${h.a}`),
  ...HOME_FAQ.map((h) => `- ${h.q} → ${h.a}`),
  "# Etapas y cómo se avanza",
  ...STAGE_GATES.map((g) => `- ${g.stage}: ${g.how} ${g.pass}`),
  ...PUBLIC_STAGES.map((s) =>
    [
      `## Etapa ${s.n} · ${s.name}: ${s.tagline}`,
      s.intro,
      ...s.facts.map((f) => `- ${f.label}: ${f.value}`),
      ...s.happens.map((h) => `- ${h.title}: ${h.body}`),
      `- Tú haces: ${s.youDo.join("; ")}`,
      `- Recibes: ${s.youGet.join("; ")}`,
      `- Cómo avanzas: ${s.advance}`,
      `- Si no: ${s.ifNot}`,
    ].join("\n"),
  ),
  "# Wave 3",
  ...WAVE3_TIMELINE.map((t) => `- ${t.when}: ${t.title}. ${t.body}`),
].join("\n");

const SYSTEM = `Eres el asistente de Ayuda de AI Edge Talent, el programa de habilitación en IA de Kibernum para sus profesionales TI.
Responde en español de Chile, cercano y claro, en 2 a 4 frases. Tutea siempre, también al cliente.

Usa únicamente la información oficial que sigue. Si la pregunta no se puede responder con ella (por ejemplo, el estado de una
postulación en particular, datos personales, montos, fechas o excepciones que no aparecen), marca answerable = false y en answer
explica en una frase que eso lo responde el equipo. No inventes plazos, cupos, reglas ni nombres. No prometas resultados de selección.
Si la persona plantea algo urgente o delicado (acceso bloqueado, un reclamo, una situación personal), answerable = false.

<informacion_oficial>
${KNOWLEDGE}
</informacion_oficial>`;

const Answer = z.object({
  answerable: z.boolean().describe("true solo si la información oficial responde la pregunta"),
  answer: z.string().describe("Respuesta breve en español, o por qué debe responderla el equipo"),
});
export type HelpAnswer = z.infer<typeof Answer>;

export async function answerHelpQuestion(question: string, audience: HelpAudience): Promise<HelpAnswer> {
  const res = await anthropic().beta.messages.parse({
    model: AI_MODEL,
    max_tokens: 2000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(Answer) },
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: `Quien pregunta es ${audience === "cliente" ? "un cliente de Kibernum" : "un profesional de Kibernum"}.\n\n<pregunta>${question}</pregunta>` }],
  });
  if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens" || !res.parsed_output) return { answerable: false, answer: "Esa pregunta la responde mejor el equipo." };
  return res.parsed_output;
}
