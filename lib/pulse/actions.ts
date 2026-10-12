"use server";

import { revalidatePath } from "next/cache";
import { supabaseService, supabaseUser } from "@/lib/supabase/server";
import { getViewer, SESSION_EXPIRED } from "@/lib/admission/auth";
import { myJourney } from "@/lib/journey/queries";
import type { Layer } from "@/lib/journey/rules";
import { pulseDef } from "./definitions";
import { dueClientPulse, duePulses, validateAnswers } from "./rules";

export type PulseResult = { ok: boolean; message: string };

/**
 * Guarda un pulso. El servidor decide quién responde y si el pulso le corresponde ahora (no se puede responder
 * uno ajeno ni uno que aún no toca); la fila queda una sola vez por persona y pulso.
 */
export async function submitPulse(key: string, waveId: string, raw: Record<string, unknown>): Promise<PulseResult> {
  try {
    const viewer = await getViewer();
    if (!viewer) throw new Error(SESSION_EXPIRED);
    const def = pulseDef(key);
    if (!def) throw new Error("Este pulso no existe.");
    const answers = validateAnswers(def, raw);
    const svc = supabaseService();
    const { data: wave } = await svc.from("waves").select("status").eq("id", waveId).maybeSingle();
    if (!wave || wave.status === "CLOSED") throw new Error("Esta Wave ya cerró.");
    const { data: prev } = await svc.from("pulse_responses").select("pulse").eq("wave_id", waveId).eq("user_id", viewer.id);
    const answered = (prev ?? []).map((p) => p.pulse);
    if (answered.includes(key)) return { ok: true, message: "Ya habías respondido este pulso. ¡Gracias!" };

    let row: { candidate_id: string | null; client_name: string | null };
    if (def.respondent === "KIBER") {
      const j = await myJourney(viewer.id);
      if (!j || j.candidate.wave_id !== waveId) throw new Error("Este pulso no corresponde a tu journey.");
      const due = duePulses({ layer: j.candidate.journey_layer as Layer | null, layerSince: j.candidate.journey_layer_since, labStatus: j.lab?.status ?? null, answered });
      if (!due.includes(key)) throw new Error("Este pulso aún no está disponible.");
      row = { candidate_id: j.candidate.id, client_name: j.candidate.client_name };
    } else {
      if (viewer.role !== "client") throw new Error("Este pulso es para el cliente.");
      const db = await supabaseUser();
      const { data: people } = await db.from("client_candidate_journey").select("journey_layer, client_name").eq("wave_id", waveId);
      if (dueClientPulse((people ?? []).map((p) => p.journey_layer as Layer | null), answered) !== key) throw new Error("Este pulso aún no está disponible.");
      row = { candidate_id: null, client_name: people?.[0]?.client_name ?? null };
    }

    const { error } = await svc.from("pulse_responses").insert({ wave_id: waveId, pulse: key, respondent: def.respondent, user_id: viewer.id, answers, ...row });
    if (error && error.code !== "23505") throw error;
    revalidatePath(def.respondent === "KIBER" ? "/mi-journey" : "/cliente");
    revalidatePath(`/admin/pulsos/${waveId}`);
    return { ok: true, message: "¡Gracias! Tu respuesta quedó registrada." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "No pudimos guardar tu respuesta. Intenta de nuevo." };
  }
}
