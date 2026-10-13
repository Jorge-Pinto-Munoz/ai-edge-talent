"use server";

import { provisionParticipant } from "@/lib/identity/provision";
import { CODE_TTL, audit, ensureAccount, issueCode, portalLink, sendIdentityEmail } from "@/lib/identity/service";
import { normalizeCLMobile } from "@/lib/identity/pin";
import { COMMUNITY_CONSENT } from "@/lib/data/consents";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { supabaseService } from "@/lib/supabase/server";
import { statusPath } from "./status";
import { evaluateOne } from "./evaluate-one";
import { getDocument } from "@/lib/content";
import type { AdmissionStatus } from "@/lib/domain/types";
import { isAcceptableVideoUrl } from "./rescue";
import { deliveryDirectory } from "@/lib/identity/directory";

/**
 * Acciones del postulante. Se identifican con su enlace personal (token aleatorio de 144 bits): al registrarse
 * pasa directo a responder, y al enviar la postulación recibe por correo las credenciales de su portal.
 * El servidor valida el token y usa la clave secreta; nada de esto expone datos de otros candidatos.
 */
export type CandidateResult = { ok: boolean; message: string };

const isEmail = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

async function byToken(token: string) {
  if (!/^[a-f0-9]{36}$/.test(token)) throw new Error("Enlace no válido.");
  const svc = supabaseService();
  const { data: c } = await svc.from("candidates").select("*, waves(*)").eq("invite_token", token).single();
  if (!c) throw new Error("Enlace no válido.");
  return { svc, c };
}

function deadlinePassed(wave: { application_deadline: string | null }) {
  return wave.application_deadline ? Date.now() > Date.parse(wave.application_deadline) : false;
}

async function moveTo(svc: ReturnType<typeof supabaseService>, id: string, from: AdmissionStatus, to: AdmissionStatus) {
  for (const step of statusPath(from, to)) {
    const { error } = await svc.from("candidates").update({ status: step }).eq("id", id);
    if (error) throw error;
  }
}

/* ───────── Autoinscripción (sin invitación previa) ───────── */
export async function selfRegister(_: unknown, form: FormData): Promise<CandidateResult> {
  const waveId = String(form.get("wave") ?? "");
  const data = {
    full_name: String(form.get("full_name") ?? "").trim(),
    corporate_email: String(form.get("corporate_email") ?? "").trim().toLowerCase(),
    client_name: String(form.get("client_name") ?? "").trim() || null,
    role_title: String(form.get("role_title") ?? "").trim() || null,
    team: String(form.get("team") ?? "").trim() || null,
    phone: normalizeCLMobile(String(form.get("phone") ?? "")),
  };
  if (!data.full_name || !isEmail(data.corporate_email) || !data.client_name || !data.role_title) {
    return { ok: false, message: "Completa nombre, correo electrónico, cliente y rol." };
  }
  if (!data.phone) return { ok: false, message: "Revisa tu teléfono: +56 9 y 8 dígitos." };
  const deliveryPick = String(form.get("delivery") ?? "").trim().toLowerCase();
  if (!deliveryPick) return { ok: false, message: "Elige a tu Delivery (o «No lo sé»)." };
  // Solo se acepta un Delivery del directorio: el valor llega del navegador y no se confía en él.
  const delivery = deliveryPick === "none" ? null : (await deliveryDirectory()).find((d) => d.email === deliveryPick) ?? null;
  if (deliveryPick !== "none" && !delivery) return { ok: false, message: "Elige a tu Delivery de la lista." };
  const community = form.get("community") === "1";
  const svc = supabaseService();
  const { data: wave } = await svc.from("waves").select("id, name, application_deadline, status").eq("id", waveId).single();
  if (!wave || !["OPEN_FOR_NOMINATION", "ASSESSMENT"].includes(wave.status)) return { ok: false, message: "Esta Wave no está recibiendo postulaciones." };
  if (deadlinePassed(wave)) return { ok: false, message: "El plazo de postulación cerró." };

  const { data: existing } = await svc.from("candidates").select("id, invite_token, full_name").eq("wave_id", waveId).ilike("corporate_email", data.corporate_email).maybeSingle();
  const row =
    existing ??
    (await svc.from("candidates").insert({ ...data, wave_id: waveId, source: "self", status: "IDENTIFIED" }).select("id, invite_token, full_name").single()).data;
  if (!row) return { ok: false, message: "No pudimos registrar tu postulación. Intenta nuevamente." };
  if (existing) await svc.from("candidates").update({ phone: data.phone }).eq("id", row.id);
  if (delivery) await linkDelivery(svc, row.id, waveId, delivery);
  // Consentimiento opcional y trazable (texto y versión exactos).
  if (community) {
    await svc.from("consents").insert({ kind: "COMMUNITY", version: COMMUNITY_CONSENT.version, text_snapshot: `${COMMUNITY_CONSENT.text} ${COMMUNITY_CONSENT.detail}`, email: data.corporate_email, candidate_id: row.id });
  }

  // Registro nuevo: pasa directo a responder. El correo se verifica después: las credenciales del portal
  // llegan a ese correo al enviar la postulación.
  if (!existing) redirect(`/postular/${row.invite_token}`);

  // Ya había una postulación con este correo: no se abre aquí (podría ser de otra persona). Se continúa desde el
  // portal, con el código que llega a ese correo.
  const access = await sendPortalAccess(svc, row.id, data.corporate_email, row.full_name, waveId, null);
  return {
    ok: true,
    message: access === "has_pin"
      ? `Ya tienes una postulación con ${data.corporate_email}. Ingresa a tu portal con tu correo y tu código personal para continuar.`
      : access === "sent"
        ? `Ya tienes una postulación con ${data.corporate_email}. Te enviamos un código a ese correo para continuar desde tu portal.`
        : `Ya tienes una postulación con ${data.corporate_email}. Ingresa en "Ingresar" y toca "Olvidé mi código" para recibir tu acceso.`,
  };
}

/** Vincula al profesional con el Delivery que eligió: asignación, responsable visible y Delivery de la Wave. */
async function linkDelivery(svc: ReturnType<typeof supabaseService>, candidateId: string, waveId: string, d: { email: string; name: string }) {
  const { data: prev } = await svc.from("delivery_assignments").select("delivery_email").eq("candidate_id", candidateId).maybeSingle();
  if (prev?.delivery_email === d.email) return;
  await Promise.all([
    svc.from("delivery_assignments").upsert({ candidate_id: candidateId, wave_id: waveId, delivery_email: d.email, assigned_at: new Date().toISOString() }, { onConflict: "candidate_id" }),
    svc.from("candidates").update({ delivery_owner: d.name }).eq("id", candidateId),
    svc.from("wave_staff").upsert({ wave_id: waveId, email: d.email, role: "delivery" }, { onConflict: "wave_id,email,role", ignoreDuplicates: true }),
    audit("delivery.self_assigned", { candidateId, waveId, targetEmail: d.email, details: { previous: prev?.delivery_email ?? null } }, svc),
  ]);
}

/**
 * Aviso al Delivery asignado: su profesional envió el Assessment. Le habilita el acceso a su vista de equipo
 * (crea su cuenta con el rol de role_grants si no existe) y, si aún no tiene código personal, incluye uno temporal.
 */
async function notifyDelivery(svc: ReturnType<typeof supabaseService>, candidateId: string, waveId: string, waveName: string, professional: string, submittedAt: Date) {
  try {
    const { data: a } = await svc.from("delivery_assignments").select("delivery_email").eq("candidate_id", candidateId).maybeSingle();
    if (!a) return;
    const email = a.delivery_email;
    const name = (await deliveryDirectory()).find((d) => d.email === email)?.name ?? null;
    const { userId } = await ensureAccount(email, name, svc);
    const when = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(submittedAt).replace(",", " a las") + " (hora de Chile)";
    const next = `/equipo?wave=${waveId}`;
    const { data: cred } = await svc.from("user_credentials").select("pin_hash").eq("user_id", userId).maybeSingle();
    const meta = { userId, candidateId, waveId };
    if (cred?.pin_hash) {
      await sendIdentityEmail("DELIVERY_APPLICATION_SUBMITTED", email, { name: name ?? undefined, stage: waveName, extra: professional, when, link: portalLink("ingresar", email, next) }, meta, svc);
      return;
    }
    const code = await issueCode(email, "ACTIVATION", null, 4, svc);
    await sendIdentityEmail("DELIVERY_APPLICATION_SUBMITTED", email, { name: name ?? undefined, stage: waveName, extra: professional, when, code, minutes: CODE_TTL.ACTIVATION, link: portalLink("activar", email, next) }, meta, svc);
  } catch (e) {
    console.error("[postulación] aviso a Delivery", e instanceof Error ? e.message : e);
  }
}

/**
 * Credenciales del portal del profesional: crea (o reutiliza) su cuenta, la vincula a la postulación y envía el
 * correo. Si aún no tiene código personal, incluye uno temporal de 4 dígitos (al primer ingreso crea el suyo).
 * Nunca se muestra el código en pantalla: solo llega al correo, así se verifica que el correo es suyo.
 */
async function sendPortalAccess(svc: ReturnType<typeof supabaseService>, candidateId: string, email: string, fullName: string, waveId: string, waveName: string | null): Promise<"sent" | "has_pin" | "failed"> {
  try {
    const { userId } = await ensureAccount(email, fullName, svc);
    await svc.from("candidates").update({ user_id: userId }).eq("id", candidateId).is("user_id", null);
    const { data: cred } = await svc.from("user_credentials").select("pin_hash").eq("user_id", userId).maybeSingle();
    if (cred?.pin_hash) {
      if (waveName) await sendIdentityEmail("APPLICATION_RECEIVED", email, { name: fullName, stage: waveName, link: portalLink("ingresar", email) }, { userId, candidateId, waveId }, svc);
      return "has_pin";
    }
    const code = await issueCode(email, "ACTIVATION", null, 4, svc);
    const r = waveName
      ? await sendIdentityEmail("APPLICATION_RECEIVED", email, { name: fullName, stage: waveName, code, extra: email, minutes: CODE_TTL.ACTIVATION, link: portalLink("activar", email) }, { userId, candidateId, waveId }, svc)
      : await sendIdentityEmail("ACTIVATION", email, { name: fullName, code, minutes: CODE_TTL.ACTIVATION, link: portalLink("activar", email) }, { userId, candidateId, waveId }, svc);
    return r.ok ? "sent" : "failed";
  } catch (e) {
    console.error("[postulación] credenciales", e instanceof Error ? e.message : e);
    return "failed";
  }
}

/* ───────── Confirmación informada previa → habilita el formulario ───────── */
export async function acknowledgeAndStart(token: string, checkedIds: string[]): Promise<CandidateResult> {
  try {
    const { svc, c } = await byToken(token);
    if (deadlinePassed(c.waves)) return { ok: false, message: "El plazo de postulación cerró." };
    const doc = getDocument("PRE_APPLICATION_ACK", c.waves.acknowledgement_version);
    if (!doc) return { ok: false, message: "Confirmación no configurada para esta Wave." };
    if (!doc.confirmations.every((x) => checkedIds.includes(x.id))) return { ok: false, message: "Debes confirmar cada punto." };
    await svc.from("acknowledgements").insert({ candidate_id: c.id, wave_id: c.wave_id, acknowledgement_version: doc.version, confirmed_items: checkedIds });
    const { data: questions } = await svc.from("application_questions").select("id, position, prompt, help, kind, options, required").eq("wave_id", c.wave_id).order("position");
    await svc.from("applications").upsert({ candidate_id: c.id, questions_snapshot: questions ?? [] }, { onConflict: "candidate_id", ignoreDuplicates: true });
    if (["NOMINATED", "INVITED", "IDENTIFIED"].includes(c.status)) await moveTo(svc, c.id, c.status, "APPLICATION_STARTED");
    return { ok: true, message: "ok" };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

/* ───────── Guardar borrador / enviar ───────── */
export async function saveAnswers(token: string, answers: Record<string, string>, submit: boolean): Promise<CandidateResult> {
  try {
    const { svc, c } = await byToken(token);
    if (c.status !== "APPLICATION_STARTED") return { ok: false, message: "Esta postulación ya fue enviada." };
    if (deadlinePassed(c.waves)) return { ok: false, message: "El plazo de postulación cerró." };
    const { data: app } = await svc.from("applications").select("id, questions_snapshot").eq("candidate_id", c.id).single();
    if (!app) return { ok: false, message: "Primero confirma las condiciones para postular." };
    const qs = (app.questions_snapshot ?? []) as { id: string; required: boolean }[];
    const clean = Object.fromEntries(qs.map((q) => [q.id, String(answers[q.id] ?? "").slice(0, 8000)]));
    if (submit) {
      const missing = qs.filter((q) => q.required && !clean[q.id].trim()).length;
      if (missing) return { ok: false, message: `Faltan ${missing} respuesta(s) obligatoria(s).` };
    }
    const now = new Date();
    await svc.from("applications").update({ answers: clean, ...(submit ? { submitted_at: now.toISOString() } : {}) }).eq("id", app.id);
    if (submit) {
      await moveTo(svc, c.id, "APPLICATION_STARTED", "APPLICATION_SUBMITTED");
      // Gracias por postular + credenciales del portal para seguir el estado.
      await sendPortalAccess(svc, c.id, c.corporate_email, c.full_name, c.wave_id, c.waves.name);
      // Aviso a su Delivery (si eligió uno al registrarse) con acceso a su vista de equipo.
      await notifyDelivery(svc, c.id, c.wave_id, c.waves.name, c.full_name, now);
      // Evaluación inmediata con IA después de responder (no bloquea al postulante). Es una propuesta: decide una persona.
      if (process.env.ANTHROPIC_API_KEY) after(async () => void (await evaluateOne(supabaseService(), c.id, null)));
    }
    return { ok: true, message: submit ? "submitted" : "Borrador guardado." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

/* ───────── Carta de compromiso → inscripción ───────── */
export async function acceptCommitmentByToken(token: string, fullName: string, checked: boolean): Promise<CandidateResult> {
  try {
    const { svc, c } = await byToken(token);
    if (!checked) return { ok: false, message: "Debes marcar explícitamente la confirmación." };
    if (fullName.trim().length < 3) return { ok: false, message: "Escribe tu nombre completo." };
    if (!["SELECTED", "CONDITIONS_PENDING"].includes(c.status)) return { ok: false, message: "El compromiso solo se acepta tras la selección." };
    const docVersion = c.waves.commitment_version as string;
    const condVersion = c.waves.conditions_version as string;
    // Presentar (o reutilizar) la versión vigente; versiones anteriores pasan a SUPERSEDED sin perderse.
    const { data: open } = await svc.from("commitment_acceptances").select("*").eq("candidate_id", c.id).in("status", ["PENDING", "ACCEPTED"]);
    let current = (open ?? []).find((r) => r.document_version === docVersion && r.conditions_version === condVersion && r.status === "PENDING");
    if (!current) {
      const { data } = await svc.from("commitment_acceptances").insert({ candidate_id: c.id, wave_id: c.wave_id, document_version: docVersion, conditions_version: condVersion }).select("*").single();
      current = data!;
      for (const old of open ?? []) await svc.from("commitment_acceptances").update({ status: "SUPERSEDED", superseded_by: current.id }).eq("id", old.id);
    }
    if (c.status === "SELECTED") await moveTo(svc, c.id, "SELECTED", "CONDITIONS_PENDING");
    // accepted_at lo fija la base de datos (sin aceptación retroactiva).
    const { error } = await svc.from("commitment_acceptances").update({ status: "ACCEPTED", accepted_by: fullName.trim() }).eq("id", current.id);
    if (error) throw error;
    await moveTo(svc, c.id, "CONDITIONS_PENDING", "ENROLLED");
    // Paso oficial a AI First Mindset: se activa su portal (cuenta + código temporal por correo). Nunca bloquea la aceptación.
    try {
      await provisionParticipant(c.id);
    } catch (e) {
      console.error("[activación] provisionParticipant", e);
    }
    return { ok: true, message: "enrolled" };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

/* ───────── Video de rescate (bajo el corte) ───────── */
const RESCUE_MAX_MB = 50;
const errMsg = (e: unknown) => (e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e));

/** URL firmada para subir el video directo a Storage (privado). Solo si la persona está en rescate. */
export async function requestRescueUpload(token: string, fileName: string, sizeBytes: number): Promise<CandidateResult & { path?: string; uploadToken?: string }> {
  try {
    const { svc, c } = await byToken(token);
    if (c.status !== "RESCUE_REQUIRED") throw new Error("Tu postulación no tiene un rescate pendiente.");
    if (sizeBytes > RESCUE_MAX_MB * 1024 * 1024) throw new Error(`El archivo supera ${RESCUE_MAX_MB} MB. Usa un enlace (YouTube no listado, Drive u OneDrive).`);
    const safe = fileName.normalize("NFD").replace(/[^\w.\-]+/g, "_").slice(-80);
    const path = `${c.id}/rescate-${Date.now()}-${safe}`;
    const { data, error } = await svc.storage.from("submissions").createSignedUploadUrl(path);
    if (error || !data) throw new Error("No se pudo preparar la subida. Intenta con un enlace.");
    return { ok: true, message: "ok", path, uploadToken: data.token };
  } catch (e) {
    return { ok: false, message: errMsg(e) };
  }
}

/** Registra el video (archivo subido o enlace). Se puede reemplazar mientras no haya sido revisado. */
export async function submitRescue(token: string, input: { path?: string; url?: string; note?: string }): Promise<CandidateResult> {
  try {
    const { svc, c } = await byToken(token);
    if (c.status !== "RESCUE_REQUIRED") throw new Error("Tu postulación no tiene un rescate pendiente.");
    const url = input.url?.trim() || null;
    const path = input.path && input.path.startsWith(`${c.id}/rescate-`) ? input.path : null;
    if (!path && !url) throw new Error("Sube tu video o pega un enlace.");
    if (url && !isAcceptableVideoUrl(url)) throw new Error("Usa un enlace https de YouTube, Vimeo, Loom, Google Drive, OneDrive o Dropbox.");
    const { data: prev } = await svc.from("rescue_videos").select("reviewed_at").eq("candidate_id", c.id).maybeSingle();
    if (prev?.reviewed_at) throw new Error("Tu video ya fue revisado.");
    const { error } = await svc.from("rescue_videos").upsert({ candidate_id: c.id, video_path: path, video_url: url, candidate_note: input.note?.trim() || null, submitted_at: new Date().toISOString() });
    if (error) throw error;
    await svc.from("admission_events").insert({ candidate_id: c.id, from_status: "RESCUE_REQUIRED", to_status: "RESCUE_REQUIRED", actor_label: "postulante", note: "Envió video de rescate" });
    return { ok: true, message: "Recibimos tu video. El equipo AI Edge Talent lo revisará y te escribirá con el resultado." };
  } catch (e) {
    console.error("[rescate]", e);
    return { ok: false, message: errMsg(e) };
  }
}
