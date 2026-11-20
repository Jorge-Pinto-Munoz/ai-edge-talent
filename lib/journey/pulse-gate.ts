import "server-only";
import { supabaseService } from "@/lib/supabase/server";
import { CLOSING_PULSE } from "./closure";
import { LAYERS, layerIndex, type Layer } from "./rules";
import { pulseTitle } from "@/lib/pulse/rules";

/**
 * Pulsos de cierre de las etapas ya pasadas que la persona no respondió (p. ej. la movieron de etapa). Son
 * obligatorios: mientras falte alguno, no puede trabajar en su etapa actual.
 */
export async function pendingPreviousPulses(candidateId: string, layer: Layer | null, svc = supabaseService()): Promise<string[]> {
  const current = layerIndex(layer ?? "AI_MINDSET");
  const keys = LAYERS.filter((l) => layerIndex(l.id) < current).map((l) => CLOSING_PULSE[l.id]).filter((k): k is string => Boolean(k));
  if (!keys.length) return [];
  const { data } = await svc.from("pulse_responses").select("pulse").eq("candidate_id", candidateId).in("pulse", keys);
  const answered = new Set((data ?? []).map((p) => p.pulse as string));
  return keys.filter((k) => !answered.has(k));
}

/** Lanza un error legible si falta un pulso obligatorio de una etapa anterior. */
export async function assertPreviousPulses(candidateId: string, layer: Layer | null, svc = supabaseService()): Promise<void> {
  const [first] = await pendingPreviousPulses(candidateId, layer, svc);
  if (first) throw new Error(`Antes de continuar, responde el ${pulseTitle(first).replace(/^Pulso/, "pulso")} en tu journey (2 minutos).`);
}
