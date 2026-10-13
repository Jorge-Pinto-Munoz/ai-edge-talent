import "server-only";
import { supabaseService } from "@/lib/supabase/server";
import { CODE_TTL, audit, ensureAccount, issueCode, portalLink, sendIdentityEmail } from "./service";

/**
 * Activación automática del portal cuando el profesional pasa oficialmente a AI First Mindset:
 * Assessment aprobado (decisión SELECTED) + compromiso aceptado (ENROLLED). Terminar el Assessment no basta.
 * Idempotente: el mismo evento no crea cuentas duplicadas ni cambia credenciales existentes.
 */
export async function provisionParticipant(candidateId: string, actor: string | null = null): Promise<{ ok: boolean; message: string; devCode?: string }> {
  const svc = supabaseService();
  const { data: c } = await svc.from("candidates").select("id, wave_id, full_name, corporate_email, status, user_id").eq("id", candidateId).single();
  if (!c) return { ok: false, message: "Postulación no encontrada." };
  if (!["ENROLLED", "MINDSET_READY"].includes(c.status)) return { ok: false, message: "Aún no está autorizado el paso a AI First Mindset." };
  const email = c.corporate_email.toLowerCase();

  // stage.transition.authorized: solo una vez por postulación.
  const first = await audit("stage.transition.authorized", { actor, targetEmail: email, candidateId, waveId: c.wave_id, eventKey: `transition:${candidateId}:AI_MINDSET`, details: { from: "ASSESSMENT", to: "AI_MINDSET" } }, svc);
  if (!first) return { ok: true, message: "La activación ya se había procesado." };

  const { data: prof } = await svc.from("profiles").select("id, status, role").eq("email", email).maybeSingle();
  if (!prof) await svc.from("role_grants").upsert({ email, role: "kiber" }, { onConflict: "email", ignoreDuplicates: true });
  const { userId, created } = await ensureAccount(email, c.full_name, svc);
  await svc.from("candidates").update({ user_id: userId }).eq("id", candidateId);

  if (prof && (prof.status === "PAUSED" || prof.status === "REVOKED" || prof.status === "DELETED")) {
    await audit("user.invitation.skipped", { actor, targetUser: userId, targetEmail: email, candidateId, waveId: c.wave_id, details: { reason: `cuenta ${prof.status}` } }, svc);
    return { ok: true, message: "La cuenta está pausada o revocada: Administración decide su reactivación." };
  }
  // Primera vez (cuenta pendiente): bienvenida a la etapa; si ya ingresaba, aviso de acceso habilitado. Sin códigos:
  // entra con su correo y un código de un solo uso.
  const template = !prof || prof.status === "PENDING" ? "ACTIVATION" : "ACCESS_UPDATED";
  const r = await sendIdentityEmail(template, email, { name: c.full_name, link: portalLink("ingresar", email) }, { userId, candidateId, waveId: c.wave_id, sentBy: actor }, svc);
  await audit(template === "ACTIVATION" ? "user.invitation.requested" : "user.access.enabled", { actor, targetUser: userId, targetEmail: email, candidateId, waveId: c.wave_id, details: { created, sent: r.ok, error: r.error } }, svc);
  return { ok: true, message: r.ok ? "Acceso habilitado y aviso enviado." : `Cuenta lista; el correo no salió (${r.error}).` };
}
