"use server";

import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admission/auth";
import { audit, ensureAccount, portalLink, sendIdentityEmail } from "@/lib/identity/service";
import { errorText } from "@/lib/text/errors";
import { LAYERS, layerName, type Layer } from "./rules";

const JOURNEY: Layer[] = ["AI_MINDSET", "ROLE_ENABLEMENT", "AI_LAB_SHOWCASE", "CLOSURE"];
const ADMITTED = ["SELECTED", "CONDITIONS_PENDING", "CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"];

export type MoveResult = { ok: boolean; message: string; email?: "sent" | "failed" | "skipped" };

/**
 * Admin: mueve a un participante a cualquier etapa del journey (adelante o atrás), sin exigir requisitos ni pulso de
 * cierre. Si aún no estaba inscrito, lo inscribe y habilita su acceso. Queda registrado (evento, auditoría con nota)
 * y, si se pide, se le avisa por correo con copia a su Delivery.
 */
export async function moveParticipant(candidateId: string, to: Layer, note: string, notify: boolean): Promise<MoveResult> {
  try {
    const viewer = await requireRole(["admin"]);
    if (!JOURNEY.includes(to)) throw new Error("Etapa no válida.");
    const svc = supabaseService();
    const { data: c } = await svc.from("candidates").select("id, wave_id, full_name, corporate_email, status, journey_layer, user_id").eq("id", candidateId).single();
    if (!c) throw new Error("Participante no encontrado.");
    if (!ADMITTED.includes(c.status)) throw new Error("Solo se puede mover a alguien seleccionado o inscrito. Primero decide su admisión.");
    if (c.journey_layer === to) return { ok: true, message: `Ya estaba en ${layerName(to)}.`, email: "skipped" };
    const now = new Date().toISOString();
    const reason = note.trim() || "Movido por el equipo del programa";

    // Inscripción y acceso: quien entra al journey queda inscrito y con cuenta (sin enviar códigos).
    const patch: Record<string, unknown> = { journey_layer: to, journey_layer_since: now };
    if (c.status !== "MINDSET_READY") patch.status = "MINDSET_READY";
    if (!c.user_id) {
      const email = c.corporate_email.toLowerCase();
      const { data: prof } = await svc.from("profiles").select("id").eq("email", email).maybeSingle();
      if (!prof) await svc.from("role_grants").upsert({ email, role: "kiber" }, { onConflict: "email", ignoreDuplicates: true });
      patch.user_id = (await ensureAccount(email, c.full_name, svc)).userId;
    }
    const { error: e1 } = await svc.from("journey_events").insert({ candidate_id: c.id, from_layer: c.journey_layer, to_layer: to, exception: true, note: `Movido por admin: ${reason}`, actor: viewer.id });
    if (e1) throw e1;
    const { error: e2 } = await svc.from("candidates").update(patch).eq("id", c.id);
    if (e2) throw e2;
    await audit("stage.transition.moved", { actor: viewer.id, actorEmail: viewer.email, candidateId: c.id, waveId: c.wave_id, targetEmail: c.corporate_email, details: { from: c.journey_layer, to, previousStatus: c.status, note: reason } }, svc);

    let email: MoveResult["email"] = "skipped";
    let detail = "";
    if (notify) {
      const r = await sendIdentityEmail("STAGE_MOVED", c.corporate_email, { name: c.full_name, stage: LAYERS.find((l) => l.id === to)!.name, extra: note.trim() || undefined, link: portalLink("ingresar", c.corporate_email, "/mi-journey") }, { userId: (patch.user_id as string | undefined) ?? c.user_id, candidateId: c.id, waveId: c.wave_id, sentBy: viewer.id }, svc);
      email = r.ok ? "sent" : "failed";
      detail = r.ok ? " Correo enviado con copia a su Delivery." : ` El correo no salió (${r.error}).`;
    }
    revalidatePath(`/admin/admision/${c.wave_id}`, "layout");
    revalidatePath(`/admin/journey/${c.wave_id}`, "layout");
    revalidatePath("/mi-journey");
    return { ok: true, message: `${c.full_name} quedó en ${layerName(to)}.${detail}`, email };
  } catch (e) {
    return { ok: false, message: errorText(e) };
  }
}
