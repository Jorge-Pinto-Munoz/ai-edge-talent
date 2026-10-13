"use server";

import { requireRole } from "@/lib/admission/auth";
import { AI_MODEL, aiConfigured, anthropic } from "./client";

export type AiCheck = { ok: boolean; message: string; model?: string; ms?: number };

/** Admin: prueba real de la conexión con Claude (una llamada mínima). Nunca muestra la llave. */
export async function testAiConnection(): Promise<AiCheck> {
  await requireRole(["admin"]);
  if (!aiConfigured()) return { ok: false, message: "Falta ANTHROPIC_API_KEY en el servidor (Vercel → Production) y un Redeploy." };
  const t0 = Date.now();
  try {
    const r = await anthropic().messages.create({ model: AI_MODEL, max_tokens: 16, messages: [{ role: "user", content: "Responde solo con la palabra OK." }] });
    return { ok: true, message: "Conexión con Claude funcionando.", model: r.model, ms: Date.now() - t0 };
  } catch (e) {
    const status = (e as { status?: number }).status;
    const msg =
      status === 401 ? "La llave no es válida o fue revocada. Revisa ANTHROPIC_API_KEY en Vercel."
      : status === 403 ? "La llave no tiene permiso para este modelo o la organización no tiene acceso."
      : status === 404 ? `El modelo ${AI_MODEL} no está disponible para esta llave.`
      : status === 429 ? "Límite de uso alcanzado o sin saldo: revisa Plans & Billing en la consola de Anthropic."
      : status === 529 || status === 503 ? "El servicio de Claude está saturado en este momento. Intenta en unos minutos."
      : "No pudimos conectar con Claude. Intenta de nuevo.";
    console.error("[ia] prueba de conexión", status ?? "", e instanceof Error ? e.message.slice(0, 200) : "");
    return { ok: false, message: msg };
  }
}
