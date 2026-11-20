"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/admission/auth";
import { supabaseService } from "@/lib/supabase/server";
import { audit } from "@/lib/identity/service";
import { errorText } from "@/lib/text/errors";

/** Admin: asigna (o quita, con texto vacío) la certificación AI CERT de una o varias personas de una Wave. */
export async function assignCertification(waveId: string, candidateIds: string[], course: string): Promise<{ ok: boolean; message: string }> {
  try {
    const viewer = await requireRole(["admin"]);
    const name = course.trim().slice(0, 120);
    const ids = [...new Set(candidateIds)].slice(0, 200);
    if (!ids.length) throw new Error("Selecciona al menos una persona.");
    const svc = supabaseService();
    const { data: ok } = await svc.from("candidates").select("id").eq("wave_id", waveId).in("id", ids);
    if ((ok ?? []).length !== ids.length) throw new Error("Hay personas que no son de esta Wave.");
    const now = new Date().toISOString();
    const { data: existing } = await svc.from("aicert_progress").select("candidate_id").in("candidate_id", ids);
    const has = new Set((existing ?? []).map((r) => r.candidate_id));
    // Solo cambia el curso especialista: el avance que reporta la persona se conserva.
    if (has.size) {
      const { error } = await svc.from("aicert_progress").update({ specialist_course: name || null, updated_at: now, updated_by: viewer.id }).in("candidate_id", [...has]);
      if (error) throw error;
    }
    const fresh = ids.filter((id) => !has.has(id));
    if (fresh.length && name) {
      const { error } = await svc.from("aicert_progress").insert(fresh.map((candidate_id) => ({ candidate_id, specialist_course: name, updated_at: now, updated_by: viewer.id })));
      if (error) throw error;
    }
    await audit("aicert.course.assigned", { actor: viewer.id, actorEmail: viewer.email, waveId, details: { course: name || null, n: ids.length } }, svc);
    revalidatePath(`/admin/journey/${waveId}`, "layout");
    revalidatePath("/mi-journey");
    return { ok: true, message: name ? `${name} asignada a ${ids.length} persona(s).` : `Certificación quitada a ${ids.length} persona(s).` };
  } catch (e) {
    return { ok: false, message: errorText(e) };
  }
}
