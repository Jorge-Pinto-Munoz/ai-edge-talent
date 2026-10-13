"use server";

import { requireRole } from "@/lib/admission/auth";
import { AI_MODEL, aiConfigured, aiErrorMessage, anthropic } from "./client";

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
    const msg = aiErrorMessage(e);
    console.error("[ia] prueba de conexión", status ?? "", e instanceof Error ? e.message.slice(0, 200) : "");
    return { ok: false, message: msg };
  }
}
