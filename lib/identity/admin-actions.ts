"use server";

import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { requireRole, type Viewer } from "@/lib/admission/auth";
import { LAYERS, type Layer } from "@/lib/journey/rules";
import { CODE_TTL, audit, ensureAccount, issueCode, portalLink, revokeSessions, sendIdentityEmail, setAuthBan } from "./service";
import { normalizePhone } from "./phone";
import { CREATABLE_ROLES, ROLE_LABEL, isRole, type CreatableRole, type Role } from "./roles";

export type AdminResult = { ok: boolean; message: string; devCode?: string };
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const dev = () => process.env.NODE_ENV !== "production";
const fail = (e: unknown): AdminResult => ({ ok: false, message: e instanceof Error ? e.message : String(e) });
/** Mensaje legible si la base rechaza el cambio (cuenta principal, última cuenta admin). */
const dbCheck = (error: { message: string } | null) => {
  if (error) throw new Error(/administración|principal|autorizado/i.test(error.message) ? error.message : "No pudimos guardar el cambio.");
};
const done = (message: string, extra: Partial<AdminResult> = {}): AdminResult => {
  revalidatePath("/admin/usuarios");
  return { ok: true, message, ...extra };
};

async function admin(): Promise<Viewer> {
  return requireRole(["admin"]);
}
async function target(userId: string) {
  const { data } = await supabaseService().from("profiles").select("id, email, full_name, role, status").eq("id", userId).single();
  if (!data) throw new Error("La cuenta no existe.");
  return data as { id: string; email: string; full_name: string | null; role: Role; status: string };
}

/** Invitación de acceso (sin código): la persona ingresa con su correo y recibe un código de un solo uso. */
async function sendAccessCode(t: { id: string; email: string; full_name: string | null; role: string }, actor: Viewer, kind: "invite" | "reset") {
  const svc = supabaseService();
  const template = t.role === "delivery" ? "DELIVERY_INVITE" : "ACCOUNT_INVITE";
  const r = await sendIdentityEmail(template, t.email, { name: t.full_name ?? undefined, stage: ROLE_LABEL[t.role], link: portalLink("ingresar", t.email) }, { userId: t.id, sentBy: actor.id }, svc);
  await audit("user.invitation.requested", { actor: actor.id, actorEmail: actor.email, targetUser: t.id, targetEmail: t.email, details: { kind, sent: r.ok, error: r.error } }, svc);
  return { sent: r.ok, error: r.error, devCode: undefined as string | undefined };
}
const sentMsg = (s: { sent: boolean; error: string | null }, ok: string) => (s.sent ? ok : `${ok.replace(/ y enviamos.*$/, "")}. El correo no salió: ${s.error ?? "error del proveedor"}. Puedes reenviarlo.`);

// ───────────── Crear ─────────────
export async function createUser(input: { kind: CreatableRole; fullName: string; email: string; phone?: string; waveIds: string[]; clientName?: string; roleTitle?: string }): Promise<AdminResult> {
  try {
    const actor = await admin();
    if (!(CREATABLE_ROLES as readonly string[]).includes(input.kind)) throw new Error("Rol inválido.");
    const email = input.email.trim().toLowerCase();
    const fullName = input.fullName.trim();
    if (fullName.length < 2) throw new Error("Ingresa el nombre completo.");
    if (!EMAIL_RE.test(email)) throw new Error("Revisa el correo electrónico.");
    const phone = input.phone?.trim() ? normalizePhone(input.phone) : null;
    if (input.phone?.trim() && !phone) throw new Error("Teléfono inválido: revisa el código de país y el número.");
    const svc = supabaseService();
    const { data: existing } = await svc.from("profiles").select("id, role, status").eq("email", email).maybeSingle();
    if (existing && existing.role !== input.kind && existing.role !== "kiber") throw new Error(`Ese correo ya tiene una cuenta con rol ${ROLE_LABEL[existing.role] ?? existing.role}. Cámbiale el rol desde su ficha.`);
    if (existing && (existing.status === "DELETED" || existing.status === "REVOKED")) throw new Error("Ese correo tiene una cuenta revocada o eliminada. Reactívala desde su ficha.");

    await svc.from("role_grants").upsert({ email, role: input.kind, client_name: null, granted_by: actor.id, full_name: fullName });
    const { userId, created } = await ensureAccount(email, fullName, svc);
    const { error: upErr } = await svc.from("profiles").update({ role: input.kind, full_name: fullName, ...(phone ? { phone } : {}), updated_at: new Date().toISOString() }).eq("id", userId);
    dbCheck(upErr);
    if (existing && existing.role !== input.kind) await revokeSessions(userId, email, svc);

    if (input.kind === "delivery") {
      for (const w of input.waveIds) await svc.from("wave_staff").upsert({ wave_id: w, email, role: "delivery", added_by: actor.id });
    } else if (input.kind === "kiber" && input.waveIds[0]) {
      // Un alta manual NO aprueba evaluaciones: el profesional queda invitado a postular en la Wave (o se vincula a su postulación).
      const w = input.waveIds[0];
      const { data: cand } = await svc.from("candidates").select("id").eq("wave_id", w).ilike("corporate_email", email).maybeSingle();
      if (cand) await svc.from("candidates").update({ user_id: userId }).eq("id", cand.id);
      else {
        const { error } = await svc.from("candidates").insert({ wave_id: w, full_name: fullName, corporate_email: email, client_name: input.clientName?.trim() || null, role_title: input.roleTitle?.trim() || null, status: "INVITED", source: "manual", user_id: userId, phone });
        if (error) throw error;
      }
    }
    await audit("user.created", { actor: actor.id, actorEmail: actor.email, targetUser: userId, targetEmail: email, details: { kind: input.kind, waves: input.waveIds, created } }, svc);
    const s = await sendAccessCode({ id: userId, email, full_name: fullName, role: input.kind }, actor, "invite");
    return done(sentMsg(s, `Cuenta ${created ? "creada" : "actualizada"} y enviamos el acceso a ${email}.`), { devCode: s.devCode });
  } catch (e) {
    return fail(e);
  }
}

// ───────────── Editar y rol ─────────────
export async function updateUser(userId: string, input: { fullName: string; phone: string }): Promise<AdminResult> {
  try {
    const actor = await admin();
    const t = await target(userId);
    const phone = input.phone.trim() ? normalizePhone(input.phone) : null;
    if (input.phone.trim() && !phone) throw new Error("Teléfono inválido: revisa el código de país y el número.");
    await supabaseService().from("profiles").update({ full_name: input.fullName.trim() || null, phone, updated_at: new Date().toISOString() }).eq("id", userId);
    await audit("user.updated", { actor: actor.id, actorEmail: actor.email, targetUser: userId, targetEmail: t.email, details: { fields: ["full_name", "phone"] } });
    return done("Datos actualizados.");
  } catch (e) {
    return fail(e);
  }
}

export async function changeRole(userId: string, role: Role, confirmEmail: string): Promise<AdminResult> {
  try {
    const actor = await admin();
    if (!isRole(role)) throw new Error("Rol inválido.");
    const t = await target(userId);
    if (confirmEmail.trim().toLowerCase() !== t.email) throw new Error("Para confirmar, escribe el correo de la cuenta.");
    if (t.id === actor.id) throw new Error("No puedes cambiar tu propio rol.");
    const svc = supabaseService();
    if (t.role === "admin") {
      const { count } = await svc.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin").eq("status", "ACTIVE");
      if ((count ?? 0) <= 1) throw new Error("Debe quedar al menos una cuenta de administración activa.");
    }
    const { error } = await svc.from("profiles").update({ role, updated_at: new Date().toISOString() }).eq("id", userId);
    dbCheck(error);
    await svc.from("role_grants").upsert({ email: t.email, role, granted_by: actor.id });
    await revokeSessions(userId, t.email, svc); // los permisos nuevos rigen desde el próximo ingreso
    await audit("user.role.changed", { actor: actor.id, actorEmail: actor.email, targetUser: userId, targetEmail: t.email, details: { from: t.role, to: role } }, svc);
    return done(`Rol actualizado a ${ROLE_LABEL[role] ?? role}. Sus sesiones se cerraron para aplicar los nuevos permisos.`);
  } catch (e) {
    return fail(e);
  }
}

export async function setDeliveryWaves(userId: string, waveIds: string[]): Promise<AdminResult> {
  try {
    const actor = await admin();
    const t = await target(userId);
    if (t.role !== "delivery") throw new Error("Solo las cuentas Delivery se asignan a Waves aquí.");
    const svc = supabaseService();
    const { data: cur } = await svc.from("wave_staff").select("wave_id").eq("email", t.email).eq("role", "delivery");
    const now = new Set((cur ?? []).map((r) => r.wave_id));
    for (const w of waveIds) if (!now.has(w)) await svc.from("wave_staff").insert({ wave_id: w, email: t.email, role: "delivery", added_by: actor.id });
    const removed = [...now].filter((w) => !waveIds.includes(w));
    if (removed.length) await svc.from("wave_staff").delete().eq("email", t.email).eq("role", "delivery").in("wave_id", removed);
    await audit("user.waves.changed", { actor: actor.id, actorEmail: actor.email, targetUser: userId, targetEmail: t.email, details: { waves: waveIds, removed } }, svc);
    return done("Waves actualizadas.");
  } catch (e) {
    return fail(e);
  }
}

// ───────────── Estado de la cuenta ─────────────
export async function setAccountStatus(userId: string, status: "ACTIVE" | "PAUSED" | "REVOKED" | "DELETED", reason: string, confirmEmail?: string): Promise<AdminResult> {
  try {
    const actor = await admin();
    const t = await target(userId);
    if (t.id === actor.id && status !== "ACTIVE") throw new Error("No puedes pausar, revocar ni eliminar tu propia cuenta.");
    if ((status === "DELETED" || status === "REVOKED") && confirmEmail?.trim().toLowerCase() !== t.email) throw new Error("Para confirmar, escribe el correo de la cuenta.");
    if (status !== "ACTIVE" && reason.trim().length < 5) throw new Error("Indica el motivo (queda en el historial).");
    const svc = supabaseService();
    const { error } = await svc.from("profiles").update({ status, updated_at: new Date().toISOString() }).eq("id", userId);
    dbCheck(error);
    if (status === "ACTIVE") {
      await setAuthBan(userId, false, svc);
      await svc.from("user_credentials").update({ failed_count: 0, locked_until: null }).eq("user_id", userId);
    } else {
      await setAuthBan(userId, true, svc);
      await revokeSessions(userId, t.email, svc);
    }
    if (status === "DELETED") await svc.from("delivery_assignments").delete().eq("delivery_email", t.email);
    const action = { ACTIVE: t.status === "PENDING" ? "user.activated" : "user.access.reactivated", PAUSED: "user.access.paused", REVOKED: "user.access.revoked", DELETED: "user.deleted" }[status];
    await audit(action, { actor: actor.id, actorEmail: actor.email, targetUser: userId, targetEmail: t.email, details: { reason: reason.trim(), from: t.status } }, svc);
    const label = { ACTIVE: "Cuenta activa", PAUSED: "Cuenta pausada", REVOKED: "Acceso revocado", DELETED: "Cuenta dada de baja (datos conservados según la política)" }[status];
    return done(`${label}.`);
  } catch (e) {
    return fail(e);
  }
}

// ───────────── Códigos y sesiones ─────────────
export async function resendInvite(userId: string): Promise<AdminResult> {
  try {
    const actor = await admin();
    const t = await target(userId);
    if (t.status === "PAUSED" || t.status === "REVOKED" || t.status === "DELETED") throw new Error("Reactiva la cuenta antes de reenviar la invitación.");
    const s = await sendAccessCode(t, actor, "reset");
    return done(sentMsg(s, `Enviamos el acceso a ${t.email}: ingresa con su correo y recibe un código.`));
  } catch (e) {
    return fail(e);
  }
}

export async function closeSessions(userId: string): Promise<AdminResult> {
  try {
    const actor = await admin();
    const t = await target(userId);
    await revokeSessions(userId, t.email);
    await supabaseService().from("access_sessions").update({ ended_at: new Date().toISOString() }).eq("user_id", userId).is("ended_at", null);
    await audit("user.sessions.closed", { actor: actor.id, actorEmail: actor.email, targetUser: userId, targetEmail: t.email });
    return done("Sesiones cerradas en todos sus dispositivos.");
  } catch (e) {
    return fail(e);
  }
}

/** Historial de una cuenta: eventos de auditoría e ingresos. */
export async function userHistory(userId: string) {
  await admin();
  const t = await target(userId);
  const svc = supabaseService();
  const [{ data: events }, { data: emails }] = await Promise.all([
    svc.from("audit_log").select("at, action, actor_email, details").or(`target_user.eq.${userId},target_email.eq.${t.email}`).order("at", { ascending: false }).limit(60),
    svc.from("email_messages").select("created_at, template, subject, status, error").eq("to_email", t.email).order("created_at", { ascending: false }).limit(20),
  ]);
  return { events: events ?? [], emails: emails ?? [] };
}

// ───────────── Solicitudes de acceso especial ─────────────
export async function decideAccessRequest(id: string, input: { decision: "APPROVED" | "REJECTED"; note: string; resumeLayer?: Layer | ""; candidateId?: string | ""; role?: string }): Promise<AdminResult> {
  try {
    const actor = await admin();
    if (input.note.trim().length < 5) throw new Error("Registra la justificación de la decisión.");
    const svc = supabaseService();
    const { data: req } = await svc.from("access_requests").select("*").eq("id", id).single();
    if (!req || req.status !== "PENDING") throw new Error("La solicitud ya fue resuelta.");
    if (input.decision === "REJECTED") {
      await svc.from("access_requests").update({ status: "REJECTED", decided_at: new Date().toISOString(), decided_by: actor.id, decision_note: input.note.trim() }).eq("id", id);
      await sendIdentityEmail("ACCESS_REQUEST_REJECTED", req.email, { name: req.name, extra: input.note.trim() }, { sentBy: actor.id }, svc);
      await audit("access.request.rejected", { actor: actor.id, actorEmail: actor.email, targetEmail: req.email, details: { request: id, note: input.note.trim() } }, svc);
      return done("Solicitud rechazada y notificada.");
    }

    // Aprobar: reutiliza la cuenta si existe (reactiva), nunca duplica.
    // Solicitud de cuenta: el admin asigna el rol definitivo (por defecto el pedido).
    const role = req.kind === "ACCOUNT" ? input.role || req.requested_role : null;
    if (req.kind === "ACCOUNT" && (!role || !isRole(role))) throw new Error("Elige el rol de la cuenta.");
    const { data: prof } = await svc.from("profiles").select("id, status, role").eq("email", req.email).maybeSingle();
    if (role) await svc.from("role_grants").upsert({ email: req.email, role, granted_by: actor.id }, { onConflict: "email" });
    else if (!prof) await svc.from("role_grants").upsert({ email: req.email, role: "kiber", granted_by: actor.id }, { onConflict: "email", ignoreDuplicates: true });
    const { userId } = await ensureAccount(req.email, req.name, svc);
    if (role && prof?.role !== role) {
      await svc.from("profiles").update({ role, updated_at: new Date().toISOString() }).eq("id", userId);
      if (prof) await revokeSessions(userId, req.email, svc);
    }
    if (prof && prof.status !== "ACTIVE" && prof.status !== "PENDING") {
      await svc.from("profiles").update({ status: "ACTIVE" }).eq("id", userId);
      await setAuthBan(userId, false, svc);
    }
    if (req.phone) await svc.from("profiles").update({ phone: req.phone }).eq("id", userId);

    // Etapa desde la que continúa: solo sobre una postulación existente, con traza (no altera evaluaciones).
    let candidateId = input.candidateId || null;
    if (!candidateId) {
      const { data: c } = await svc.from("candidates").select("id").ilike("corporate_email", req.email).order("created_at", { ascending: false }).limit(1).maybeSingle();
      candidateId = c?.id ?? null;
    }
    if (candidateId) await svc.from("candidates").update({ user_id: userId }).eq("id", candidateId);
    if (input.resumeLayer) {
      if (!candidateId) throw new Error("Para indicar la etapa, la persona debe tener una postulación registrada.");
      if (!LAYERS.some((l) => l.id === input.resumeLayer)) throw new Error("Etapa inválida.");
      const { data: c } = await svc.from("candidates").select("journey_layer").eq("id", candidateId).single();
      await svc.from("journey_events").insert({ candidate_id: candidateId, from_layer: c?.journey_layer ?? null, to_layer: input.resumeLayer, exception: true, note: `Acceso especial aprobado: ${input.note.trim()}`, actor: actor.id });
      await svc.from("candidates").update({ journey_layer: input.resumeLayer, journey_layer_since: new Date().toISOString() }).eq("id", candidateId);
    }
    await svc.from("access_requests").update({ status: "APPROVED", decided_at: new Date().toISOString(), decided_by: actor.id, decision_note: input.note.trim(), resume_layer: input.resumeLayer || null, candidate_id: candidateId, user_id: userId, granted_role: role }).eq("id", id);

    const r = await sendIdentityEmail("ACCESS_REQUEST_APPROVED", req.email, { name: req.name, link: portalLink("ingresar", req.email) }, { userId, candidateId, sentBy: actor.id }, svc);
    await audit("access.request.approved", { actor: actor.id, actorEmail: actor.email, targetUser: userId, targetEmail: req.email, candidateId, details: { request: id, note: input.note.trim(), resume_layer: input.resumeLayer || null, role, sent: r.ok } }, svc);
    return done(r.ok ? "Solicitud aprobada y acceso enviado." : `Solicitud aprobada. El correo no salió (${r.error}); reenvía el acceso desde la ficha.`);
  } catch (e) {
    return fail(e);
  }
}

// ───────────── Asignaciones Delivery ↔ profesionales ─────────────
export async function assignDelivery(waveId: string, candidateIds: string[], deliveryEmail: string | null): Promise<AdminResult> {
  try {
    const actor = await admin();
    const svc = supabaseService();
    if (!candidateIds.length) throw new Error("Elige al menos un profesional.");
    if (deliveryEmail) {
      const { data: ws } = await svc.from("wave_staff").select("email").eq("wave_id", waveId).eq("role", "delivery").eq("email", deliveryEmail).maybeSingle();
      if (!ws) throw new Error("Ese Delivery no está asignado a esta Wave.");
      const rows = candidateIds.map((c) => ({ candidate_id: c, wave_id: waveId, delivery_email: deliveryEmail, assigned_by: actor.id, assigned_at: new Date().toISOString() }));
      const { error } = await svc.from("delivery_assignments").upsert(rows);
      if (error) throw error;
      // Mantiene el nombre visible del Delivery en el portal del profesional.
      const { data: d } = await svc.from("profiles").select("full_name").eq("email", deliveryEmail).maybeSingle();
      if (d?.full_name) await svc.from("candidates").update({ delivery_owner: d.full_name }).in("id", candidateIds);
    } else {
      await svc.from("delivery_assignments").delete().in("candidate_id", candidateIds);
    }
    await audit("delivery.assignment.changed", { actor: actor.id, actorEmail: actor.email, waveId, details: { candidates: candidateIds, delivery: deliveryEmail } }, svc);
    revalidatePath(`/admin/asignaciones/${waveId}`);
    return { ok: true, message: deliveryEmail ? `${candidateIds.length} profesional(es) asignado(s).` : "Asignación retirada." };
  } catch (e) {
    return fail(e);
  }
}

export async function setWaveDeliveries(waveId: string, emails: string[]): Promise<AdminResult> {
  try {
    const actor = await admin();
    const svc = supabaseService();
    const list = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
    const { data: valid } = await svc.from("profiles").select("email").eq("role", "delivery").in("email", list.length ? list : ["-"]);
    const ok = new Set((valid ?? []).map((v) => v.email));
    const bad = list.filter((e) => !ok.has(e));
    if (bad.length) throw new Error(`No son cuentas Delivery: ${bad.join(", ")}. Créalas primero en Usuarios y accesos.`);
    const { data: cur } = await svc.from("wave_staff").select("email").eq("wave_id", waveId).eq("role", "delivery");
    const now = new Set((cur ?? []).map((r) => r.email));
    for (const e of list) if (!now.has(e)) await svc.from("wave_staff").insert({ wave_id: waveId, email: e, role: "delivery", added_by: actor.id });
    const removed = [...now].filter((e) => !list.includes(e));
    if (removed.length) {
      await svc.from("wave_staff").delete().eq("wave_id", waveId).eq("role", "delivery").in("email", removed);
      await svc.from("delivery_assignments").delete().eq("wave_id", waveId).in("delivery_email", removed);
    }
    await audit("wave.deliveries.changed", { actor: actor.id, actorEmail: actor.email, waveId, details: { deliveries: list, removed } }, svc);
    revalidatePath(`/admin/asignaciones/${waveId}`);
    return { ok: true, message: "Delivery de la Wave actualizados." };
  } catch (e) {
    return fail(e);
  }
}

// ───────────── Configuración operativa ─────────────
export async function saveReminderSettings(input: { every_days: number; max: number; delivery_after_days: number }): Promise<AdminResult> {
  try {
    const actor = await admin();
    const v = { every_days: Math.round(input.every_days), max: Math.round(input.max), delivery_after_days: Math.round(input.delivery_after_days) };
    if (!(v.every_days >= 1 && v.every_days <= 30 && v.max >= 0 && v.max <= 10 && v.delivery_after_days >= 1 && v.delivery_after_days <= 60)) throw new Error("Revisa los valores: frecuencia 1–30 días, máximo 0–10, aviso a Delivery 1–60 días.");
    await supabaseService().from("app_settings").upsert({ key: "reminders", value: v, updated_by: actor.id, updated_at: new Date().toISOString() });
    await audit("settings.reminders.changed", { actor: actor.id, actorEmail: actor.email, details: v });
    return done("Configuración guardada.");
  } catch (e) {
    return fail(e);
  }
}

export async function setShareExperience(waveId: string, share: boolean): Promise<AdminResult> {
  try {
    const actor = await admin();
    await supabaseService().from("wave_settings").upsert({ wave_id: waveId, share_experience: share, updated_by: actor.id, updated_at: new Date().toISOString() });
    await audit(share ? "wave.experience.shared" : "wave.experience.unshared", { actor: actor.id, actorEmail: actor.email, waveId });
    revalidatePath(`/admin/pulsos/${waveId}`);
    return { ok: true, message: share ? "Los Delivery de esta Wave ven la experiencia de sus profesionales." : "Se dejó de compartir la experiencia con Delivery." };
  } catch (e) {
    return fail(e);
  }
}

/** Activa el portal de los inscritos de una Wave que aún no lo tienen (idempotente; útil para inscritos previos). */
export async function provisionWave(waveId: string): Promise<AdminResult> {
  try {
    const actor = await admin();
    const { provisionParticipant } = await import("./provision");
    const svc = supabaseService();
    const { data: cands } = await svc.from("candidates").select("id").eq("wave_id", waveId).in("status", ["ENROLLED", "MINDSET_READY"]);
    let sent = 0;
    for (const c of cands ?? []) {
      const r = await provisionParticipant(c.id, actor.id);
      if (r.ok && !/ya se había/.test(r.message)) sent++;
    }
    revalidatePath(`/admin/asignaciones/${waveId}`);
    return { ok: true, message: sent ? `Activamos ${sent} portal(es) pendientes.` : "Todos los inscritos ya tenían su activación procesada." };
  } catch (e) {
    return fail(e);
  }
}
