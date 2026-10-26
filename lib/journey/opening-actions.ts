"use server";

import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admission/auth";
import { audit } from "@/lib/identity/service";
import { notifyStageOpen } from "./opening";
import { errorText } from "@/lib/text/errors";

/** Abrir o programar AI First Mindset de una Wave. Solo Administración; todo queda en la auditoría. */
export type OpeningResult = { ok: boolean; message: string };
const LAYER = "AI_MINDSET";
const errText = (e: unknown) => (errorText(e));
const fmt = (iso: string) =>
  new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso)) + " (hora de Chile)";

async function waveExists(svc: ReturnType<typeof supabaseService>, waveId: string) {
  const { data } = await svc.from("waves").select("id").eq("id", waveId).maybeSingle();
  if (!data) throw new Error("Wave no encontrada.");
}

function refresh(waveId: string) {
  revalidatePath(`/admin/journey/${waveId}`);
  revalidatePath(`/admin/journey/${waveId}/mindset`);
  revalidatePath("/mi-journey");
}

export async function openStage(waveId: string): Promise<OpeningResult> {
  try {
    const viewer = await requireRole(["admin"]);
    const svc = supabaseService();
    await waveExists(svc, waveId);
    const now = new Date().toISOString();
    const { data: cur } = await svc.from("wave_stage_openings").select("opens_at").eq("wave_id", waveId).eq("layer", LAYER).maybeSingle();
    if (cur?.opens_at && cur.opens_at <= now) return { ok: true, message: "La etapa ya estaba abierta." };
    const { error } = await svc.from("wave_stage_openings").upsert({ wave_id: waveId, layer: LAYER, opens_at: now, set_by: viewer.id, set_at: now, notified_at: null });
    if (error) throw error;
    await audit("journey.stage.opened", { actor: viewer.id, actorEmail: viewer.email, waveId, details: { layer: LAYER, opens_at: now } }, svc);
    const n = await notifyStageOpen(waveId, svc);
    refresh(waveId);
    const mail = n.sent + n.failed === 0 ? "No hay personas inscritas para avisar todavía; quienes se inscriban verán el reto al entrar." : `Aviso enviado a ${n.sent}${n.failed ? `; ${n.failed} no salieron y quedan en reintento automático` : ""}.`;
    return { ok: true, message: `AI First Mindset abierta. ${mail}` };
  } catch (e) {
    return { ok: false, message: errText(e) };
  }
}

/** `when`: "48h" o una fecha ISO futura. */
export async function scheduleStage(waveId: string, when: string): Promise<OpeningResult> {
  try {
    const viewer = await requireRole(["admin"]);
    const svc = supabaseService();
    await waveExists(svc, waveId);
    const at = when === "48h" ? new Date(Date.now() + 48 * 3_600_000) : new Date(when);
    if (Number.isNaN(at.getTime())) throw new Error("Fecha no válida.");
    if (at.getTime() <= Date.now() + 5 * 60_000) throw new Error("Elige una fecha al menos 5 minutos en el futuro, o usa «Abrir etapa».");
    if (at.getTime() > Date.now() + 120 * 86_400_000) throw new Error("La fecha no puede estar a más de 120 días.");
    const { data: cur } = await svc.from("wave_stage_openings").select("opens_at").eq("wave_id", waveId).eq("layer", LAYER).maybeSingle();
    if (cur?.opens_at && new Date(cur.opens_at).getTime() <= Date.now()) throw new Error("La etapa ya está abierta.");
    const iso = at.toISOString();
    const { error } = await svc.from("wave_stage_openings").upsert({ wave_id: waveId, layer: LAYER, opens_at: iso, set_by: viewer.id, set_at: new Date().toISOString(), notified_at: null });
    if (error) throw error;
    await audit("journey.stage.scheduled", { actor: viewer.id, actorEmail: viewer.email, waveId, details: { layer: LAYER, opens_at: iso } }, svc);
    refresh(waveId);
    return { ok: true, message: `Apertura programada para el ${fmt(iso)}.` };
  } catch (e) {
    return { ok: false, message: errText(e) };
  }
}

export async function cancelSchedule(waveId: string): Promise<OpeningResult> {
  try {
    const viewer = await requireRole(["admin"]);
    const svc = supabaseService();
    const { data, error } = await svc.from("wave_stage_openings").update({ opens_at: null, set_by: viewer.id, set_at: new Date().toISOString() }).eq("wave_id", waveId).eq("layer", LAYER).gt("opens_at", new Date().toISOString()).select("wave_id");
    if (error) throw error;
    if (!data?.length) throw new Error("No hay una apertura programada para cancelar.");
    await audit("journey.stage.schedule_cancelled", { actor: viewer.id, actorEmail: viewer.email, waveId, details: { layer: LAYER } }, svc);
    refresh(waveId);
    return { ok: true, message: "Apertura programada cancelada. La etapa sigue cerrada." };
  } catch (e) {
    return { ok: false, message: errText(e) };
  }
}
