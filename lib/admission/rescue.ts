/**
 * Video de rescate (especificación v1, sección 8): para quien queda bajo el corte (nivel D).
 * Complementa el Assessment —no lo reemplaza ni obliga a seleccionar— y el Product Lead reevalúa.
 * Las preguntas buscan lo que el formulario escrito puede subrepresentar: compromiso, interés concreto y afinidad con la IA.
 */
export const RESCUE_MAX_MINUTES = 3;

export const RESCUE_QUESTIONS: { key: "commitment" | "interest" | "ai_affinity" | "autonomy"; question: string; why: string }[] = [
  { key: "commitment", question: "¿Qué te motiva a ser parte de AI Edge Talent?", why: "Compromiso: motivación propia para sostener el proceso." },
  { key: "ai_affinity", question: "¿Cómo crees que la inteligencia artificial puede transformar tu manera de trabajar?", why: "Afinidad con la IA: una visión concreta de su uso en el trabajo." },
  { key: "interest", question: "Cuéntanos un desafío real de tu trabajo y cómo utilizarías IA para abordarlo.", why: "Interés concreto: una oportunidad real de aplicación." },
  { key: "autonomy", question: "¿Qué estás dispuesto a aprender o cambiar para aprovechar esta oportunidad?", why: "Disposición: apertura a aprender y cambiar." },
];

/** Criterios con que el Product Lead reevalúa el video (1–5 cada uno). */
export const RESCUE_CRITERIA = [
  { key: "commitment", label: "Compromiso" },
  { key: "interest", label: "Interés concreto" },
  { key: "ai_affinity", label: "Afinidad con la IA" },
] as const;

export const RESCUE_SCALE = ["1 · No se observa", "2 · Débil", "3 · Suficiente", "4 · Claro", "5 · Sobresaliente"];

/** Acepta solo enlaces http(s) a plataformas de video o almacenamiento conocidas. */
export function isAcceptableVideoUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:") return false;
    return /(^|\.)(youtube\.com|youtu\.be|vimeo\.com|loom\.com|drive\.google\.com|onedrive\.live\.com|1drv\.ms|sharepoint\.com|dropbox\.com|stream\.microsoft\.com)$/.test(u.hostname);
  } catch {
    return false;
  }
}

/* ───────── Ventana de rescate (24 h) y estado ───────── */

/** Plazo para entregar el video desde que Administración ofrece el rescate. */
export const RESCUE_WINDOW_HOURS = 24;

export type RescueState = "none" | "available" | "preparing" | "submitted" | "in_review" | "approved" | "not_approved" | "expired";

export const RESCUE_STATE_LABEL: Record<RescueState, string> = {
  none: "Rescate no habilitado",
  available: "Rescate disponible",
  preparing: "Rescate en preparación",
  submitted: "Rescate enviado",
  in_review: "Rescate en revisión",
  approved: "Rescate aprobado",
  not_approved: "Rescate no aprobado",
  expired: "Plazo vencido",
};

export interface RescueInput {
  status: string;
  invitation: { expires_at: string | null; started_at: string | null } | null;
  video: { submitted_at: string; reviewed_at: string | null } | null;
}

/**
 * Estado del rescate, derivado de la invitación, el video y el estado de admisión. Solo existe si Administración
 * ofreció el rescate. "Aprobado"/"no aprobado" es la decisión final registrada después de revisar el video.
 */
export function rescueState(r: RescueInput, now = new Date()): RescueState {
  if (!r.invitation) return "none";
  if (r.video) {
    if (r.status === "SELECTED" || r.status === "CONDITIONS_PENDING" || r.status === "CONDITIONS_ACCEPTED" || r.status === "ENROLLED" || r.status === "MINDSET_READY") return "approved";
    if (r.status === "NOT_SELECTED") return "not_approved";
    return r.video.reviewed_at ? "in_review" : "submitted";
  }
  if (r.status === "NOT_SELECTED") return "expired";
  if (r.invitation.expires_at && new Date(r.invitation.expires_at).getTime() < now.getTime()) return "expired";
  return r.invitation.started_at ? "preparing" : "available";
}

/** ¿Se puede entregar o reemplazar el video ahora? (la base de datos aplica la misma regla). */
export function rescueOpen(r: RescueInput, now = new Date()): boolean {
  if (!r.invitation || r.status !== "RESCUE_REQUIRED") return false;
  if (r.video?.reviewed_at) return false;
  return !r.invitation.expires_at || new Date(r.invitation.expires_at).getTime() >= now.getTime();
}

/** Tiempo restante legible ("23 h 10 min", "8 min"). */
export function timeLeft(expiresAt: string, now = new Date()): string {
  const ms = new Date(expiresAt).getTime() - now.getTime();
  if (ms <= 0) return "0 min";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h} h ${m} min` : `${Math.max(1, m)} min`;
}

/**
 * Elegibilidad para ofrecer rescate (regla de la especificación v1): quien queda bajo el corte según la rúbrica
 * (nivel D o recomendación de rescate), con resultado de Assessment y sin un rescate previo.
 */
export function rescueEligibility(input: { status: string; level: string | null; recommendation: string | null; pl: string | null; hadInvitation: boolean }): { ok: boolean; reason: string } {
  if (input.hadInvitation) return { ok: false, reason: "Ya tuvo una oportunidad de rescate en esta Wave." };
  if (!["ASSESSMENT_EVALUATED", "HUMAN_REVIEW"].includes(input.status)) return { ok: false, reason: "El rescate se ofrece al decidir sobre un Assessment evaluado." };
  if (!input.level) return { ok: false, reason: "Primero se necesita el resultado del Assessment." };
  const under = input.level === "D" || input.recommendation === "RESCUE_REQUIRED" || input.pl === "ACTIVAR_RESCATE";
  return under ? { ok: true, reason: "Quedó bajo el corte: puede complementar con un video." } : { ok: false, reason: "El rescate es para quienes quedan bajo el corte (nivel D) según la rúbrica." };
}
