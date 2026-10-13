import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/** Modelo por defecto de la plataforma (evaluación de Assessment, Ayuda y síntesis de pulsos). */
export const AI_MODEL = "claude-opus-5-5";
export const aiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY?.trim());

/** Workspace de Anthropic: solo hace falta si la llave no pertenece a uno (la API lo pide en un encabezado). */
export const aiWorkspace = () => process.env.ANTHROPIC_WORKSPACE_ID?.trim() || null;

let client: Anthropic | null = null;
/** Cliente único (solo servidor: la llave nunca llega al navegador). */
export function anthropic(): Anthropic {
  if (!aiConfigured()) throw new Error("Falta ANTHROPIC_API_KEY en el servidor.");
  const ws = aiWorkspace();
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!.trim(), defaultHeaders: ws ? { "anthropic-workspace-id": ws } : undefined });
  return client;
}

/** Traduce un error de la API de Claude a un mensaje para administración (sin datos de la llave). */
export function aiErrorMessage(e: unknown): string {
  const status = (e as { status?: number }).status;
  const raw = String((e as { message?: unknown })?.message ?? e);
  if (/anthropic-workspace-id|not scoped to a workspace/i.test(raw))
    return "La llave no pertenece a un workspace de Anthropic. Crea la llave dentro de un workspace (Console → Workspaces) o agrega ANTHROPIC_WORKSPACE_ID en Vercel, y haz Redeploy.";
  if (/credit balance|billing/i.test(raw)) return "La cuenta de Anthropic no tiene saldo: carga créditos en Console → Billing.";
  if (status === 401) return "La llave no es válida o fue revocada. Revisa ANTHROPIC_API_KEY en Vercel.";
  if (status === 403) return "La llave no tiene permiso para este modelo o la organización no tiene acceso.";
  if (status === 404) return `El modelo ${AI_MODEL} no está disponible para esta llave.`;
  if (status === 429) return "Límite de uso alcanzado o sin saldo: revisa Billing y Limits en la consola de Anthropic.";
  if (status === 529 || status === 503) return "El servicio de Claude está saturado en este momento. Intenta en unos minutos.";
  if (status === 400) return `Claude rechazó la solicitud: ${raw.replace(/^\d+\s*/, "").slice(0, 200)}`;
  return raw.slice(0, 240) || "No pudimos conectar con Claude. Intenta de nuevo.";
}
