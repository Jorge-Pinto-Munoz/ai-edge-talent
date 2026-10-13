import "server-only";
import { createHash } from "node:crypto";
import { supabaseService } from "@/lib/supabase/server";
import { FIELDS, type SummaryField } from "@/lib/ai/pulse-summary";
import { CLOSING_PULSE } from "@/lib/journey/closure";
import type { Layer } from "@/lib/journey/rules";
import { NOTHING_YET } from "./definitions";

/** Textos del pulso de cierre de una etapa, sin nombres, en orden estable (para detectar si cambiaron). */
export async function closingTexts(waveId: string, layer: Layer) {
  const { data } = await supabaseService().from("pulse_responses").select("answers, created_at").eq("wave_id", waveId).eq("pulse", CLOSING_PULSE[layer]!).order("created_at");
  const rows = (data ?? [])
    .map((r) => Object.fromEntries(FIELDS.map((f) => [f, typeof (r.answers as Record<string, unknown>)?.[f] === "string" ? String((r.answers as Record<string, string>)[f]).trim() : ""])) as Record<SummaryField, string>)
    .map((r) => ({ ...r, mejorar: r.mejorar.toLowerCase() === NOTHING_YET.toLowerCase() ? "" : r.mejorar }))
    .filter((r) => FIELDS.some((f) => r[f]));
  return { rows, hash: createHash("sha256").update(JSON.stringify(rows)).digest("hex") };
}

