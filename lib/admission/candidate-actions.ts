"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { supabaseService } from "@/lib/supabase/server";
import { env, serverEnv } from "@/lib/supabase/env";
import { statusPath } from "./status";
import { evaluateOne } from "./evaluate-one";
import { getDocument } from "@/lib/content";
import { renderEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import type { AdmissionStatus } from "@/lib/domain/types";
import { fmtDeadline } from "@/components/ui";
import { isAcceptableVideoUrl } from "./rescue";

/**
 * Acciones del postulante. No requieren cuenta: se identifican con el enlace personal (token aleatorio
 * de 144 bits) que reciben por correo. El servidor valida el token y usa la clave secreta;
 * nada de esto expone datos de otros candidatos.
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
  };
  if (!data.full_name || !isEmail(data.corporate_email) || !data.client_name || !data.role_title) {
    return { ok: false, message: "Completa nombre, correo corporativo, cliente y rol." };
  }
  const svc = supabaseService();
  const { data: wave } = await svc.from("waves").select("id, name, application_deadline, status").eq("id", waveId).single();
  if (!wave || !["OPEN_FOR_NOMINATION", "ASSESSMENT"].includes(wave.status)) return { ok: false, message: "Esta Wave no está recibiendo postulaciones." };
  if (deadlinePassed(wave)) return { ok: false, message: "El plazo de postulación cerró." };

  const { data: existing } = await svc.from("candidates").select("id, invite_token, full_name").eq("wave_id", waveId).ilike("corporate_email", data.corporate_email).maybeSingle();
  const row =
    existing ??
    (await svc.from("candidates").insert({ ...data, wave_id: waveId, source: "self", status: "IDENTIFIED" }).select("id, invite_token, full_name").single()).data;
  if (!row) return { ok: false, message: "No pudimos registrar tu postulación. Intenta nuevamente." };

  // El enlace personal se entrega SIEMPRE por correo: así verificamos que el correo es tuyo.
  const link = `${env.appUrl}/postular/${row.invite_token}`;
  const { subject, text } = renderEmail(existing ? "REMINDER" : "INVITATION", {
    firstName: row.full_name.split(" ")[0],
    waveName: wave.name,
    link,
    deadline: wave.application_deadline ? fmtDeadline(wave.application_deadline) : null,
    senderName: "Equipo AI Edge Talent",
  });
  const sent = await sendEmail(data.corporate_email, subject, text);
  await svc.from("email_messages").insert({
    wave_id: waveId,
    candidate_id: row.id,
    to_email: data.corporate_email,
    template: existing ? "REMINDER" : "INVITATION",
    subject,
    body_text: text,
    status: sent.error ? "failed" : "sent",
    provider_id: sent.id,
    error: sent.error,
    sent_at: sent.error ? null : new Date().toISOString(),
  });
  if (sent.error) {
    // Sin servicio de correo configurado (ambiente de prueba): se continúa directo solo si el registro es nuevo.
    if (!serverEnv().resendApiKey && !existing) redirect(`/postular/${row.invite_token}`);
    return { ok: false, message: "No pudimos enviarte el enlace por correo. Escríbele a tu Delivery." };
  }
  return { ok: true, message: `Te enviamos tu enlace personal de postulación a ${data.corporate_email}. Revisa tu bandeja (y spam).` };
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
    await svc.from("applications").update({ answers: clean, ...(submit ? { submitted_at: new Date().toISOString() } : {}) }).eq("id", app.id);
    if (submit) {
      await moveTo(svc, c.id, "APPLICATION_STARTED", "APPLICATION_SUBMITTED");
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
