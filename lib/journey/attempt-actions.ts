"use server";

import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admission/auth";
import { audit, portalLink, sendIdentityEmail } from "@/lib/identity/service";
import { errorText } from "@/lib/text/errors";
import { maxWithGrant } from "./attempts";
import { syncMany } from "./closure-sync";

export type GrantResult = { ok: boolean; message: string; email?: "sent" | "failed" | "skipped" };

/**
 * Admin: da un intento extra a una persona en un módulo (excepción registrada con motivo).
 * Suma 1 al máximo de intentos solo para ella; opcionalmente le avisa por correo con copia a su Delivery.
 */
export async function grantExtraAttempt(candidateId: string, capsuleId: string, note: string, notify: boolean): Promise<GrantResult> {
  try {
    const viewer = await requireRole(["admin"]);
    const reason = note.trim().slice(0, 500);
    if (reason.length < 5) throw new Error("Escribe brevemente el motivo del intento extra (queda registrado).");
    const svc = supabaseService();
    const [{ data: c }, { data: cap }, { data: prev }] = await Promise.all([
      svc.from("candidates").select("id, wave_id, full_name, corporate_email, user_id").eq("id", candidateId).maybeSingle(),
      svc.from("capsules").select("id, wave_id, title, max_attempts").eq("id", capsuleId).maybeSingle(),
      svc.from("attempt_grants").select("extra").eq("candidate_id", candidateId).eq("capsule_id", capsuleId).maybeSingle(),
    ]);
    if (!c || !cap || cap.wave_id !== c.wave_id) throw new Error("Persona o módulo no encontrado.");
    if (cap.max_attempts === null) throw new Error("Este módulo no tiene máximo de intentos: puede volver a entregar sin excepción.");
    const extra = (prev?.extra ?? 0) + 1;
    if (extra > 5) throw new Error("Ya tiene 5 intentos extra en este módulo.");
    const { error } = await svc.from("attempt_grants").upsert({ candidate_id: c.id, capsule_id: cap.id, extra, note: reason, granted_by: viewer.id, updated_at: new Date().toISOString() });
    if (error) throw error;
    const { count: used } = await svc.from("submissions").select("id", { count: "exact", head: true }).eq("candidate_id", c.id).eq("capsule_id", cap.id).eq("status", "NOT_APPROVED");
    const max = maxWithGrant(cap.max_attempts, extra);
    await audit("submission.attempt_granted", { actor: viewer.id, actorEmail: viewer.email, candidateId: c.id, waveId: c.wave_id, targetEmail: c.corporate_email, details: { capsule: cap.id, title: cap.title, extra, max, note: reason } }, svc);
    // Si estaba marcada «Requiere atención» por intentos agotados, el estado se recalcula.
    await syncMany([c.id], viewer.id);

    let email: GrantResult["email"] = "skipped";
    let detail = "";
    if (notify) {
      const r = await sendIdentityEmail("ATTEMPT_GRANTED", c.corporate_email, { name: c.full_name, stage: cap.title, attempts: { used: used ?? 0, max }, link: portalLink("ingresar", c.corporate_email, `/mi-journey?m=${cap.id}`) }, { userId: c.user_id, candidateId: c.id, waveId: c.wave_id, sentBy: viewer.id }, svc);
      email = r.ok ? "sent" : "failed";
      detail = r.ok ? " Correo enviado con copia a su Delivery." : ` El correo no salió (${r.error}).`;
    }
    revalidatePath(`/admin/journey/${c.wave_id}`, "layout");
    revalidatePath("/mi-journey");
    return { ok: true, message: `${c.full_name} ya puede volver a entregar: intento ${(used ?? 0) + 1} de ${max}.${detail}`, email };
  } catch (e) {
    return { ok: false, message: errorText(e) };
  }
}
