"use server";

import { revalidatePath } from "next/cache";
import { supabaseService, supabaseUser } from "@/lib/supabase/server";
import { env } from "@/lib/supabase/env";
import { requireRole } from "./auth";
import { statusPath } from "./status";
import { RESCUE_QUESTIONS, RESCUE_WINDOW_HOURS, rescueEligibility, rescueState } from "./rescue";
import { DIMENSIONS, LEVEL_LABEL, PL_LABEL, type Level, type PlRecommendation } from "@/lib/ai/rubric";
import { audit, ensureAccount, portalLink, sendIdentityEmail } from "@/lib/identity/service";
import { renderIdentity } from "@/lib/email/identity";
import type { AdmissionStatus } from "@/lib/domain/types";
import { deliveryDirectory } from "@/lib/identity/directory";

/**
 * Decisiones de admisión con confirmación. El administrador decide; la plataforma ejecuta en orden (estado,
 * decisión, acceso, correo, registro) y no duplica nada si la acción se repite: el cambio de estado es condicional
 * (solo avanza si el estado no cambió) y los correos llevan una clave única de evento.
 */
export type ReviewData = Awaited<ReturnType<typeof getReviewData>>;
export type DecisionResult = { ok: boolean; message: string; email?: "sent" | "failed" | "skipped"; detail?: string };
type Svc = ReturnType<typeof supabaseService>;

const fmtWhen = (iso: string) =>
  new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso)) + " (hora de Chile)";
const errText = (e: unknown) => (e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e));

async function loadCandidate(svc: Svc, id: string) {
  const { data } = await svc.from("candidates").select("id, wave_id, full_name, corporate_email, status, delivery_owner, invite_token, waves(name)").eq("id", id).maybeSingle();
  if (!data) throw new Error("Candidato no encontrado.");
  return { ...data, waveName: ((data.waves as unknown as { name: string } | null)?.name ?? data.wave_id).replace("AI Edge Talent · ", "") };
}

/** Avanza el estado paso a paso solo si nadie lo cambió antes (doble clic o dos pestañas no duplican). */
async function advance(candidateId: string, from: AdmissionStatus, to: AdmissionStatus): Promise<boolean> {
  const db = await supabaseUser();
  let cur = from;
  for (const step of statusPath(from, to)) {
    const { data, error } = await db.from("candidates").update({ status: step }).eq("id", candidateId).eq("status", cur).select("id");
    if (error) throw error;
    if (!data?.length) return false;
    cur = step;
  }
  return true;
}

async function latestEvaluation(svc: Svc, candidateId: string) {
  const { data: app } = await svc.from("applications").select("id").eq("candidate_id", candidateId).maybeSingle();
  if (!app) return null;
  const { data } = await svc.from("ai_evaluations").select("id, weighted_total, level, recommendation, pl_recommendation, scores, summary, strengths, risks, insufficient_fields, created_at").eq("application_id", app.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data;
}

async function recordDecision(candidateId: string, outcome: "SELECTED" | "RESCUE_REQUIRED" | "NOT_SELECTED", note: string, evalId: string | null, aiRec: string | null, by: string) {
  const db = await supabaseUser();
  const { error } = await db.from("decisions").insert({ candidate_id: candidateId, outcome, ai_evaluation_id: evalId, agrees_with_ai: aiRec ? aiRec === outcome : null, note: note.trim() || null, decided_by: by });
  if (error) throw error;
}

/** Fecha de apertura programada de AI First Mindset de la Wave (si existe). */
async function mindsetOpening(svc: Svc, waveId: string): Promise<string | null> {
  const { data } = await svc.from("wave_stage_openings").select("opens_at").eq("wave_id", waveId).eq("layer", "AI_MINDSET").maybeSingle();
  return data?.opens_at ?? null;
}

/** Texto individual para el correo de rescate, armado solo con resultados existentes de la rúbrica. */
/** En qué enfocar el video según la dimensión de la rúbrica que quedó baja. */
const RESCUE_FOCUS: Record<string, string> = {
  real_use: "Un ejemplo concreto de cómo usas IA hoy en tu trabajo: qué tarea, con qué herramienta y qué resultado obtuviste.",
  depth: "Un caso real contado con profundidad: el problema, cómo lo abordaste paso a paso con IA y qué cambió.",
  reframe: "Cómo imaginas que la IA transforma tu rol: qué harías distinto y qué dejarías de hacer.",
  autonomy: "Cómo aprendes por tu cuenta: qué fuentes, comunidades o pruebas usas para mejorar con IA.",
  disposition: "Tu motivación para el programa y cómo mantienes criterio propio al trabajar con IA.",
};

/**
 * Texto individual del rescate, armado solo con la rúbrica real: qué dimensiones quedaron bajas y en qué enfocar el
 * video. Administración lo revisa y edita antes de enviar; el profesional y su Delivery lo ven en la plataforma.
 */
function rescueExplanation(scores: Record<string, { score?: number }> | null): string {
  if (!scores) return "";
  // Etiqueta en minúscula inicial, sin tocar siglas (IA) ni el texto tras "/".
  const lower = (l: string) => l.split(" / ")[0].replace(/^\p{Lu}(?!\p{Lu})/u, (c) => c.toLowerCase());
  const ranked = DIMENSIONS.map((d) => ({ key: d.key as string, label: lower(d.label), score: Number(scores[d.key]?.score ?? NaN) })).filter((d) => Number.isFinite(d.score));
  if (!ranked.length) return "";
  const byLow = [...ranked].sort((a, b) => a.score - b.score);
  const low = byLow.filter((d) => d.score <= 2);
  const pick = low.length ? low.slice(0, 3) : byLow.slice(0, 2);
  const names = pick.map((d) => d.label);
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} y ${names.at(-1)}` : names[0];
  return [
    `En tu Assessment identificamos oportunidades de desarrollo en ${list}. Puede que el formulario no haya reflejado todo lo que traes: en tu video, muéstranos especialmente:`,
    ...pick.map((d) => `• ${RESCUE_FOCUS[d.key] ?? d.label}`),
  ].join("\n");
}

const REC_LABEL: Record<string, string> = { SELECTED: "Seleccionar", RESCUE_REQUIRED: "Activar rescate", HUMAN_REVIEW: "Revisión humana", NOT_SELECTED: "No seleccionar" };

type DeliveryDecision = "selected" | "rescue" | "not_selected" | "rescue_selected" | "rescue_not_selected";

/** Aviso al Delivery asignado: una vez por decisión. Nunca bloquea la decisión si el correo falla. */
async function notifyDeliveryDecision(svc: Svc, c: { id: string; wave_id: string; full_name: string; waveName: string }, decision: DeliveryDecision, when?: string) {
  try {
    const { data: a } = await svc.from("delivery_assignments").select("delivery_email").eq("candidate_id", c.id).maybeSingle();
    if (!a?.delivery_email) return;
    const first = await audit("admission.delivery.notified", { candidateId: c.id, waveId: c.wave_id, targetEmail: a.delivery_email, details: { decision }, eventKey: `delivery-decision:${c.id}:${decision}` }, svc);
    if (!first) return;
    const name = (await deliveryDirectory()).find((d) => d.email === a.delivery_email)?.name;
    await sendIdentityEmail("DELIVERY_DECISION", a.delivery_email, { name, extra: c.full_name, wave: c.waveName, when, decision, link: portalLink("ingresar", a.delivery_email, `/equipo?wave=${c.wave_id}`) }, { candidateId: c.id, waveId: c.wave_id }, svc);
  } catch (e) {
    console.error("[decisión] aviso a Delivery", e instanceof Error ? e.message : e);
  }
}

/* ───────── Lectura para el panel de evaluación ───────── */
export async function getReviewData(candidateId: string) {
  await requireRole(["admin"]);
  const svc = supabaseService();
  const c = await loadCandidate(svc, candidateId);
  const [ev, { data: events }, { data: inv }, { data: video }, opening] = await Promise.all([
    latestEvaluation(svc, candidateId),
    svc.from("admission_events").select("from_status, to_status, actor_label, note, at").eq("candidate_id", candidateId).order("at", { ascending: false }).limit(30),
    svc.from("rescue_invitations").select("offered_at, expires_at, started_at, explanation, extended_at").eq("candidate_id", candidateId).maybeSingle(),
    svc.from("rescue_videos").select("video_path, video_url, candidate_note, submitted_at, commitment, interest, ai_affinity, review_note, reviewed_at").eq("candidate_id", candidateId).maybeSingle(),
    mindsetOpening(svc, c.wave_id),
  ]);
  // Video privado: enlace temporal (15 min) solo para quien revisa.
  const videoUrl = video?.video_path ? (await svc.storage.from("submissions").createSignedUrl(video.video_path, 900)).data?.signedUrl ?? null : null;
  const scores = (ev?.scores ?? null) as Record<string, { score?: number; evidence?: string; justification?: string }> | null;
  const eligibility = rescueEligibility({ status: c.status, level: ev?.level ?? null, recommendation: ev?.recommendation ?? null, pl: ev?.pl_recommendation ?? null, hadInvitation: Boolean(inv) });
  return {
    candidate: { id: c.id, name: c.full_name, email: c.corporate_email, status: c.status, delivery: c.delivery_owner, wave: c.waveName, waveId: c.wave_id },
    evaluation: ev
      ? {
          total: Number(ev.weighted_total),
          level: ev.level as Level,
          levelLabel: LEVEL_LABEL[ev.level as Level] ?? ev.level,
          recommendation: ev.pl_recommendation ? PL_LABEL[ev.pl_recommendation as PlRecommendation] : (REC_LABEL[ev.recommendation as string] ?? null),
          summary: ev.summary as string | null,
          strengths: (ev.strengths ?? []) as string[],
          risks: (ev.risks ?? []) as string[],
          insufficient: (ev.insufficient_fields ?? []) as string[],
          dimensions: DIMENSIONS.map((d) => ({ key: d.key, label: d.label, weight: d.weight, score: scores?.[d.key]?.score ?? null, justification: scores?.[d.key]?.justification ?? null })),
          at: ev.created_at as string,
        }
      : null,
    history: events ?? [],
    rescue: inv ? { ...inv, state: rescueState({ status: c.status, invitation: inv, video: video ?? null }), video: video ? { ...video, signedUrl: videoUrl } : null } : null,
    eligibility,
    suggestedExplanation: rescueExplanation(scores),
    mindsetOpensAt: opening,
  };
}

/* ───────── Vista previa de correos ───────── */
export async function previewDecisionEmail(candidateId: string, kind: "selected" | "rescue", explanation = "") {
  await requireRole(["admin"]);
  const svc = supabaseService();
  const c = await loadCandidate(svc, candidateId);
  if (kind === "selected") {
    const opening = await mindsetOpening(svc, c.wave_id);
    const r = renderIdentity("SELECTED_WELCOME", { name: c.full_name, wave: c.waveName, link: portalLink("ingresar", c.corporate_email), when: opening && new Date(opening) > new Date() ? fmtWhen(opening) : undefined });
    return { to: c.corporate_email, subject: r.subject, text: r.text };
  }
  const expires = new Date(Date.now() + RESCUE_WINDOW_HOURS * 3_600_000).toISOString();
  const r = renderIdentity("RESCUE_INVITE", { name: c.full_name, extra: explanation.trim() || undefined, link: `${env.appUrl}/postular/${c.invite_token}`, when: fmtWhen(expires), questions: RESCUE_QUESTIONS.map((q) => q.question) });
  return { to: c.corporate_email, subject: r.subject, text: r.text };
}

/* ───────── Seleccionar ───────── */
export async function confirmSelection(candidateId: string, note = ""): Promise<DecisionResult> {
  try {
    const viewer = await requireRole(["admin"]);
    const svc = supabaseService();
    const c = await loadCandidate(svc, candidateId);
    const already = ["SELECTED", "CONDITIONS_PENDING", "CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"].includes(c.status);
    if (!already) {
      if (!["ASSESSMENT_EVALUATED", "HUMAN_REVIEW", "RESCUE_REQUIRED"].includes(c.status)) throw new Error("Solo se selecciona a alguien con el Assessment evaluado.");
      const moved = await advance(c.id, c.status as AdmissionStatus, "SELECTED");
      if (!moved) return { ok: true, message: "La decisión ya se había registrado (no se duplicó).", email: "skipped" };
      const ev = await latestEvaluation(svc, c.id);
      await recordDecision(c.id, "SELECTED", note, ev?.id ?? null, ev?.recommendation ?? null, viewer.id);
    }
    // Acceso: la cuenta queda lista (entra con su correo y un código de un solo uso; nunca se envían claves).
    const { userId } = await ensureAccount(c.corporate_email, c.full_name, svc);
    await svc.from("candidates").update({ user_id: userId }).eq("id", c.id).is("user_id", null);
    // Correo de bienvenida: una sola vez por candidato.
    const first = await audit("admission.selected.notified", { actor: viewer.id, actorEmail: viewer.email, candidateId: c.id, waveId: c.wave_id, targetEmail: c.corporate_email, eventKey: `selected-welcome:${c.id}` }, svc);
    let email: DecisionResult["email"] = "skipped";
    let detail: string | undefined;
    if (first) {
      const opening = await mindsetOpening(svc, c.wave_id);
      const r = await sendIdentityEmail("SELECTED_WELCOME", c.corporate_email, { name: c.full_name, wave: c.waveName, link: portalLink("ingresar", c.corporate_email), when: opening && new Date(opening) > new Date() ? fmtWhen(opening) : undefined }, { userId, candidateId: c.id, waveId: c.wave_id, sentBy: viewer.id }, svc);
      email = r.ok ? "sent" : "failed";
      detail = r.ok ? undefined : r.error ?? "error del proveedor";
    }
    // El Delivery ya va en copia del correo de bienvenida: solo se le avisa aparte si ese correo no salió ahora.
    if (email !== "sent") await notifyDeliveryDecision(svc, c, c.status === "RESCUE_REQUIRED" ? "rescue_selected" : "selected");
    revalidatePath(`/admin/admision/${c.wave_id}`);
    revalidatePath("/admin");
    const tail = email === "sent" ? "Correo de bienvenida enviado." : email === "failed" ? `El correo no salió (${detail}); queda en reintento automático.` : "El correo de bienvenida ya se había enviado antes.";
    return { ok: true, message: `${c.full_name} quedó seleccionado/a. ${tail}`, email, detail };
  } catch (e) {
    return { ok: false, message: errText(e) };
  }
}

/* ───────── No seleccionar (cierre) ───────── */
export async function closeNotSelected(candidateId: string, note = ""): Promise<DecisionResult> {
  try {
    const viewer = await requireRole(["admin"]);
    const svc = supabaseService();
    const c = await loadCandidate(svc, candidateId);
    if (c.status === "NOT_SELECTED") return { ok: true, message: "Ya estaba cerrado como no seleccionado.", email: "skipped" };
    if (!["ASSESSMENT_EVALUATED", "HUMAN_REVIEW", "RESCUE_REQUIRED"].includes(c.status)) throw new Error("Solo se cierra a alguien con el Assessment evaluado o en rescate.");
    const moved = await advance(c.id, c.status as AdmissionStatus, "NOT_SELECTED");
    if (!moved) return { ok: true, message: "La decisión ya se había registrado (no se duplicó).", email: "skipped" };
    const ev = await latestEvaluation(svc, c.id);
    await recordDecision(c.id, "NOT_SELECTED", note, ev?.id ?? null, ev?.recommendation ?? null, viewer.id);
    await notifyDeliveryDecision(svc, c, c.status === "RESCUE_REQUIRED" ? "rescue_not_selected" : "not_selected");
    revalidatePath(`/admin/admision/${c.wave_id}`);
    return { ok: true, message: `${c.full_name}: proceso cerrado como no seleccionado.`, email: "skipped" };
  } catch (e) {
    return { ok: false, message: errText(e) };
  }
}

/* ───────── Ofrecer rescate (24 h) ───────── */
export async function offerRescue(candidateId: string, explanation: string, note = ""): Promise<DecisionResult> {
  try {
    const viewer = await requireRole(["admin"]);
    const svc = supabaseService();
    const c = await loadCandidate(svc, candidateId);
    const ev = await latestEvaluation(svc, c.id);
    const { data: prevInv } = await svc.from("rescue_invitations").select("candidate_id").eq("candidate_id", c.id).maybeSingle();
    const elig = rescueEligibility({ status: c.status, level: ev?.level ?? null, recommendation: ev?.recommendation ?? null, pl: ev?.pl_recommendation ?? null, hadInvitation: Boolean(prevInv) });
    if (!elig.ok) throw new Error(elig.reason);
    const text = explanation.trim();
    if (text.length > 1200) throw new Error("La explicación es demasiado larga (máximo 1.200 caracteres).");
    const moved = await advance(c.id, c.status as AdmissionStatus, "RESCUE_REQUIRED");
    if (!moved) return { ok: true, message: "El rescate ya se había ofrecido (no se duplicó).", email: "skipped" };
    await recordDecision(c.id, "RESCUE_REQUIRED", note, ev?.id ?? null, ev?.recommendation ?? null, viewer.id);
    // Plazo calculado en el servidor desde este momento.
    const expires = new Date(Date.now() + RESCUE_WINDOW_HOURS * 3_600_000).toISOString();
    const { error } = await svc.from("rescue_invitations").insert({ candidate_id: c.id, wave_id: c.wave_id, offered_by: viewer.id, expires_at: expires, explanation: text || null });
    if (error) throw error;
    await audit("admission.rescue.offered", { actor: viewer.id, actorEmail: viewer.email, candidateId: c.id, waveId: c.wave_id, targetEmail: c.corporate_email, details: { expires_at: expires }, eventKey: `rescue-offer:${c.id}` }, svc);
    const r = await sendIdentityEmail("RESCUE_INVITE", c.corporate_email, { name: c.full_name, extra: text || undefined, link: `${env.appUrl}/postular/${c.invite_token}`, when: fmtWhen(expires), questions: RESCUE_QUESTIONS.map((q) => q.question) }, { candidateId: c.id, waveId: c.wave_id, sentBy: viewer.id }, svc);
    // El Delivery va en copia de la invitación al rescate: aviso aparte solo si esa invitación no salió.
    if (!r.ok) await notifyDeliveryDecision(svc, c, "rescue", fmtWhen(expires));
    revalidatePath(`/admin/admision/${c.wave_id}`);
    return {
      ok: true,
      message: r.ok ? `Rescate habilitado hasta el ${fmtWhen(expires)}. Invitación enviada.` : `Rescate habilitado hasta el ${fmtWhen(expires)}, pero el correo no salió (${r.error}); queda en reintento automático.`,
      email: r.ok ? "sent" : "failed",
      detail: r.ok ? undefined : r.error ?? undefined,
    };
  } catch (e) {
    return { ok: false, message: errText(e) };
  }
}

/* ───────── Extender el plazo (excepción autorizada) ───────── */
export async function extendRescue(candidateId: string): Promise<DecisionResult> {
  try {
    const viewer = await requireRole(["admin"]);
    const svc = supabaseService();
    const c = await loadCandidate(svc, candidateId);
    if (c.status !== "RESCUE_REQUIRED") throw new Error("Solo se extiende un rescate abierto.");
    const { data: video } = await svc.from("rescue_videos").select("candidate_id").eq("candidate_id", c.id).maybeSingle();
    if (video) throw new Error("La persona ya envió su video.");
    const expires = new Date(Date.now() + RESCUE_WINDOW_HOURS * 3_600_000).toISOString();
    const { data, error } = await svc.from("rescue_invitations").update({ expires_at: expires, extended_at: new Date().toISOString(), extended_by: viewer.id, expired_logged_at: null }).eq("candidate_id", c.id).select("candidate_id, explanation");
    if (error) throw error;
    if (!data?.length) throw new Error("No hay una invitación de rescate para extender.");
    await audit("admission.rescue.extended", { actor: viewer.id, actorEmail: viewer.email, candidateId: c.id, waveId: c.wave_id, details: { expires_at: expires } }, svc);
    const r = await sendIdentityEmail("RESCUE_INVITE", c.corporate_email, { name: c.full_name, extra: data[0].explanation ?? undefined, link: `${env.appUrl}/postular/${c.invite_token}`, when: fmtWhen(expires), questions: RESCUE_QUESTIONS.map((q) => q.question) }, { candidateId: c.id, waveId: c.wave_id, sentBy: viewer.id }, svc);
    revalidatePath(`/admin/admision/${c.wave_id}`);
    return { ok: true, message: `Plazo extendido hasta el ${fmtWhen(expires)}.${r.ok ? " Le avisamos por correo." : ` El aviso no salió (${r.error}).`}`, email: r.ok ? "sent" : "failed" };
  } catch (e) {
    return { ok: false, message: errText(e) };
  }
}
