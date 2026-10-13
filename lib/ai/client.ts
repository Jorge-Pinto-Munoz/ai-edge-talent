import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/** Modelo por defecto de la plataforma (evaluación de Assessment, Ayuda y síntesis de pulsos). */
export const AI_MODEL = "claude-opus-5-5";
export const aiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

let client: Anthropic | null = null;
/** Cliente único (solo servidor: la llave nunca llega al navegador). */
export function anthropic(): Anthropic {
  if (!aiConfigured()) throw new Error("Falta ANTHROPIC_API_KEY en el servidor.");
  client ??= new Anthropic();
  return client;
}
