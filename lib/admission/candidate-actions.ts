"use server";

import { provisionParticipant } from "@/lib/identity/provision";
import { audit, ensureAccount, portalLink, sendIdentityEmail, sendLoginCode } from "@/lib/identity/service";
import { normalizePhone } from "@/lib/identity/phone";
import { COMMUNITY_CONSENT } from "@/lib/data/consents";

import { after } from "next/server";
import { supabaseService } from "@/lib/supabase/server";
import { statusPath } from "./status";
import { evaluateOne } from "./evaluate-one";
import { getDocument } from "@/lib/content";
import type { AdmissionStatus } from "@/lib/domain/types";
import { isAcceptableVideoUrl } from "./rescue";
import { deliveryDirectory } from "@/lib/identity/directory";
import { cleanAnswers, missingRequired, type Question } from "./assessment";

/**
 * Acciones del postulante. Se identifican con su enlace personal (token aleatorio de 144 bits): al registrarse
 * pasa directo a responder, y al enviar la postulación recibe por correo las credenciales de su portal.
 * El servidor valida el token y usa la clave secreta; nada de esto expone datos de otros candidatos.
 */
export type CandidateResult = { ok: boolean; message: string };
/** Registro: al terminar, la persona verifica su correo con un código de 6 dígitos (paso "verify"). */
export type RegisterResult = CandidateResult & { step?: "verify"; email?: string; waitS?: number };
/** Guardado del Assessment: `savedAt` es la hora del servidor; `state` dice si ya quedó enviado. */
export type SaveResult = CandidateResult & { savedAt?: string; state?: "draft" | "submitted"; missing?: string[] };

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
export async function selfRegister(_: unknown, form: FormData): Promise<RegisterResult> {
  const waveId = String(form.get("wave") ?? "");
  const data = {
    full_name: String(form.get("full_name") ?? "").trim(),
    corporate_email: String(form.get("corporate_email") ?? "").trim().toLowerCase(),
    client_name: String(form.get("client_name") ?? "").trim() || null,
    role_title: String(form.get("role_title") ?? "").trim() || null,
    team: String(form.get("team") ?? "").trim() || null,
    phone: normalizePhone(String(form.get("phone") ?? "")),
  };
  if (!data.full_name || !isEmail(data.corporate_email) || !data.client_name || !data.role_title) {
    return { ok: false, message: "Completa nombre, correo electrónico, cliente y rol." };
  }
  if (!data.phone) return { ok: false, message: "Revisa tu teléfono: elige el código de país y escribe el número (en Chile, 9 dígitos)." };
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
  // Cuenta del portal y verificación del correo: se envía un código de 6 dígitos y, al ingresarlo, la persona entra a
  // su postulación (o la retoma donde quedó). La respuesta es la misma sea un registro nuevo o uno existente.
  try {
    const { userId } = await ensureAccount(data.corporate_email, data.full_name, svc);
    await svc.from("candidates").update({ user_id: userId }).eq("id", row.id).is("user_id", null);
    const { data: prof } = await svc.from("profiles").select("status").eq("id", userId).maybeSingle();
    if (prof && !["PAUSED", "REVOKED", "DELETED"].includes(prof.status)) {
      const r = await sendLoginCode(data.corporate_email, { name: data.full_name, context: "continuar tu postulación", userId, candidateId: row.id, waveId }, svc);
      if (!r.ok && r.reason === "email") return { ok: false, message: "No pudimos enviarte el código por correo. Intenta de nuevo en unos minutos." };
      return { ok: true, step: "verify", email: data.corporate_email, waitS: r.waitS ?? 45, message: `Te enviamos un código de 6 dígitos a ${data.corporate_email}.` };
    }
  } catch (e) {
    console.error("[postulación] cuenta al registrarse", e instanceof Error ? e.message : e);
    return { ok: false, message: "No pudimos registrar tu postulación. Intenta nuevamente." };
  }
  return { ok: true, step: "verify", email: data.corporate_email, waitS: 45, message: `Te enviamos un código de 6 dígitos a ${data.corporate_email}.` };
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
 * (crea su cuenta con el rol de role_grants si no existe); ingresa con su correo y un código de un solo uso.
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
    await sendIdentityEmail("DELIVERY_APPLICATION_SUBMITTED", email, { name: name ?? undefined, stage: waveName, extra: professional, when, link: portalLink("ingresar", email, next) }, { userId, candidateId, waveId }, svc);
  } catch (e) {
    console.error("[postulación] aviso a Delivery", e instanceof Error ? e.message : e);
  }
}

/**
 * Postulación recibida: asegura la cuenta del portal, la vincula y envía el correo de gracias con el enlace para
 * seguir su estado (ingresa con su correo y un código de un solo uso).
 */
async function sendPortalAccess(svc: ReturnType<typeof supabaseService>, candidateId: string, email: string, fullName: string, waveId: string, waveName: string): Promise<"sent" | "failed"> {
  try {
    const { userId } = await ensureAccount(email, fullName, svc);
    await svc.from("candidates").update({ user_id: userId }).eq("id", candidateId).is("user_id", null);
    const r = await sendIdentityEmail("APPLICATION_RECEIVED", email, { name: fullName, stage: waveName, link: portalLink("ingresar", email, "/mi-journey") }, { userId, candidateId, waveId }, svc);
    return r.ok ? "sent" : "failed";
  } catch (e) {
    console.error("[postulación] correo de postulación recibida", e instanceof Error ? e.message : e);
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
/**
 * Borrador: guarda todo lo escrito sin validar obligatorias y no cambia la etapa (sigue "En progreso").
 * Envío: valida obligatorias y se aplica UNA sola vez aunque llegue dos veces (doble clic, dos pestañas, reintento
 * tras perder la conexión): solo el primer envío marca submitted_at y dispara correos y evaluación.
 */
export async function saveAnswers(token: string, answers: Record<string, string>, submit: boolean): Promise<SaveResult> {
  try {
    const { svc, c } = await byToken(token);
    const { data: app } = await svc.from("applications").select("id, questions_snapshot, submitted_at").eq("candidate_id", c.id).maybeSingle();
    if (app?.submitted_at || !["APPLICATION_STARTED"].includes(c.status)) {
      return app?.submitted_at
        ? { ok: submit, state: "submitted", message: submit ? "Tu postulación ya estaba enviada." : "Esta postulación ya fue enviada; no se puede editar." }
        : { ok: false, message: "Primero confirma las condiciones para postular." };
    }
    if (!app) return { ok: false, message: "Primero confirma las condiciones para postular." };
    if (deadlinePassed(c.waves)) return { ok: false, message: "El plazo de postulación cerró. Lo que alcanzaste a guardar quedó registrado." };
    const qs = (app.questions_snapshot ?? []) as Question[];
    const clean = cleanAnswers(qs, answers ?? {});
    if (submit) {
      const missing = missingRequired(qs, clean);
      if (missing.length) {
        // Igual se guarda lo escrito: validar no debe hacer perder información.
        await svc.from("applications").update({ answers: clean }).eq("id", app.id).is("submitted_at", null);
        return { ok: false, missing, message: `Faltan ${missing.length} respuesta(s) obligatoria(s).` };
      }
    }
    const now = new Date();
    // Condición atómica: solo se escribe si aún no está enviada. Si otra pestaña la envió, no se pisa.
    const { data: upd, error } = await svc
      .from("applications")
      .update({ answers: clean, ...(submit ? { submitted_at: now.toISOString() } : {}) })
      .eq("id", app.id)
      .is("submitted_at", null)
      .select("updated_at");
    if (error) throw error;
    if (!upd?.length) return { ok: submit, state: "submitted", message: submit ? "Tu postulación ya estaba enviada." : "Esta postulación ya fue enviada; no se puede editar." };
    if (!submit) return { ok: true, state: "draft", savedAt: upd[0].updated_at, message: "Borrador guardado." };

    try {
      await moveTo(svc, c.id, "APPLICATION_STARTED", "APPLICATION_SUBMITTED");
    } catch (e) {
      // Sin cambio de etapa no hay envío a medias: se revierte para que pueda reintentar.
      await svc.from("applications").update({ submitted_at: null }).eq("id", app.id);
      throw e;
    }
    // Gracias por postular + credenciales del portal para seguir el estado.
    await sendPortalAccess(svc, c.id, c.corporate_email, c.full_name, c.wave_id, c.waves.name);
    // Aviso a su Delivery (si eligió uno al registrarse) con acceso a su vista de equipo.
    await notifyDelivery(svc, c.id, c.wave_id, c.waves.name, c.full_name, now);
    // Evaluación inmediata con IA después de responder (no bloquea al postulante). Es una propuesta: decide una persona.
    if (process.env.ANTHROPIC_API_KEY) after(async () => void (await evaluateOne(supabaseService(), c.id, null)));
    return { ok: true, state: "submitted", savedAt: upd[0].updated_at, message: "submitted" };
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
