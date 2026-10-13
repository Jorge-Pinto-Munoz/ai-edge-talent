"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/admission/auth";
import { supabaseService } from "@/lib/supabase/server";
import { aiConfigured, AI_MODEL } from "@/lib/ai/client";
import { summarizePulse, type PulseSummary } from "@/lib/ai/pulse-summary";
import { closingTexts } from "./summary-data";
import { CLOSING_PULSE } from "@/lib/journey/closure";
import { layerName, type Layer } from "@/lib/journey/rules";

export type SummaryResult = { ok: boolean; message: string; summary?: PulseSummary };

/** Admin: resume con IA los textos de una etapa y guarda la síntesis (se recalcula solo si llegaron respuestas nuevas). */
export async function summarizeStage(waveId: string, layer: Layer): Promise<SummaryResult> {
  try {
    const viewer = await requireRole(["admin"]);
    if (!CLOSING_PULSE[layer]) throw new Error("Esta etapa no tiene pulso de cierre.");
    if (!aiConfigured()) throw new Error("La IA no está configurada (falta ANTHROPIC_API_KEY en el servidor).");
    const { rows, hash } = await closingTexts(waveId, layer);
    if (rows.length < 3) throw new Error("Se necesitan al menos 3 respuestas con texto para resumir sin exponer a nadie.");
    const svc = supabaseService();
    const { data: prev } = await svc.from("ai_summaries").select("input_hash, content").eq("wave_id", waveId).eq("layer", layer).maybeSingle();
    if (prev?.input_hash === hash) return { ok: true, message: "La síntesis ya estaba al día.", summary: prev.content as PulseSummary };
    const summary = await summarizePulse(layerName(layer), rows);
    const { error } = await svc.from("ai_summaries").upsert({ wave_id: waveId, layer, input_hash: hash, content: summary, model: AI_MODEL, created_by: viewer.id, created_at: new Date().toISOString() });
    if (error) throw error;
    revalidatePath(`/admin/pulsos/${waveId}`);
    return { ok: true, message: `Síntesis de ${rows.length} respuestas.`, summary };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "No pudimos generar la síntesis." };
  }
}
