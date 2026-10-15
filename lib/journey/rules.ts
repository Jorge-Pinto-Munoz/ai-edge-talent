/**
 * Reglas del journey (framework AET): Assessment → AI Mindset → Role Enablement → AI Lab & Showcase → Cierre.
 * Los gates académicos bloquean el avance; los atrasos operacionales NO (generan alerta, no expulsión).
 */
export type Layer = "ASSESSMENT" | "AI_MINDSET" | "ROLE_ENABLEMENT" | "AI_LAB_SHOWCASE" | "CLOSURE";

export const LAYERS: { id: Layer; name: string; description: string }[] = [
  { id: "ASSESSMENT", name: "Assessment", description: "Diagnóstico inicial de madurez IA, capacidades técnicas y potencial de evolución profesional." },
  { id: "AI_MINDSET", name: "AI Mindset", description: "Transformación de la forma de trabajar mediante adopción AI-First aplicada al trabajo real." },
  { id: "ROLE_ENABLEMENT", name: "Role Enablement", description: "Especialización técnica por rol mediante rutas formativas y certificaciones internacionales (AI CERTs)." },
  { id: "AI_LAB_SHOWCASE", name: "AI Lab & Showcase", description: "Aplicación práctica sobre desafíos reales del negocio para generar evidencia e impacto operacional." },
  { id: "CLOSURE", name: "Cierre", description: "Resultado, evidencia, próximos pasos y casos con continuidad." },
];
export const layerName = (l: Layer | null) => (l ? LAYERS.find((x) => x.id === l)!.name : "Admisión");
export const layerIndex = (l: Layer | null) => (l ? LAYERS.findIndex((x) => x.id === l) : -1);

export type SubmissionStatus = "SUBMITTED" | "APPROVED" | "NOT_APPROVED" | "HUMAN_REVIEW";

/**
 * ¿Puede entregar (otra vez) una tarea?
 * - Con una entrega pendiente (SUBMITTED / HUMAN_REVIEW) no se reenvía: se espera la revisión.
 * - REVISIÓN HUMANA no consume intento; NOT_APPROVED sí.
 * - Alcanzado el máximo (p.ej. 2 en Mindset), solo una excepción explícita de Product Lead habilita otro.
 */
export function submissionGate(previous: SubmissionStatus[], maxAttempts: number | null): { allowed: boolean; nextAttempt: number; reason?: string } {
  const nextAttempt = previous.length + 1;
  if (previous.includes("APPROVED")) return { allowed: false, nextAttempt, reason: "Esta tarea ya está aprobada." };
  if (previous.some((s) => s === "SUBMITTED" || s === "HUMAN_REVIEW")) return { allowed: false, nextAttempt, reason: "Tu entrega anterior está en revisión." };
  const used = previous.filter((s) => s === "NOT_APPROVED").length;
  if (maxAttempts !== null && used >= maxAttempts) {
    return { allowed: false, nextAttempt, reason: `Usaste los ${maxAttempts} intentos disponibles. Solo una excepción explícita de Product Lead permite continuar.` };
  }
  return { allowed: true, nextAttempt };
}

export interface GateContext {
  admissionStatus: string;
  requiredMindsetCapsules: string[];
  approvedCapsules: string[];
  certification: { result: "PASSED" | "FAILED"; status: "PENDING_REVIEW" | "VERIFIED" | "REJECTED" } | null;
}

/** Gate para pasar a la siguiente capa. Saltos o retrocesos solo por excepción registrada. */
export function advanceGate(from: Layer | null, to: Layer, ctx: GateContext): { ok: boolean; reason?: string } {
  if (layerIndex(to) !== layerIndex(from) + 1 && !(from === null && to === "AI_MINDSET")) {
    return { ok: false, reason: "Solo se avanza a la capa siguiente (saltos o retrocesos requieren excepción)." };
  }
  switch (to) {
    case "AI_MINDSET":
      return ["ENROLLED", "MINDSET_READY"].includes(ctx.admissionStatus)
        ? { ok: true }
        : { ok: false, reason: "Requiere inscripción (compromiso aceptado)." };
    case "ROLE_ENABLEMENT": {
      const missing = ctx.requiredMindsetCapsules.filter((c) => !ctx.approvedCapsules.includes(c));
      return missing.length === 0 ? { ok: true } : { ok: false, reason: `Faltan ${missing.length} tarea(s) obligatoria(s) de AI Mindset aprobadas.` };
    }
    case "AI_LAB_SHOWCASE":
      return ctx.certification?.result === "PASSED" && ctx.certification.status === "VERIFIED"
        ? { ok: true }
        : { ok: false, reason: "La certificación AI CERT aprobada y verificada es gate de AI Lab." };
    default:
      return { ok: true };
  }
}

/** Kibernum financia hasta dos intentos de examen AI CERT. */
export function certificationAttemptNote(failedAttempts: number): string | null {
  if (failedAttempts === 0) return null;
  if (failedAttempts === 1) return "Primer intento no aprobado. Tienes un segundo intento financiado por Kibernum.";
  return "Segundo intento no aprobado: Kibernum no financia un nuevo intento y el journey AET se cierra según la regla vigente, salvo excepción explícita.";
}

/** Lunes (fecha ISO) de la semana de `date` en hora de Chile: clave del feedback semanal. */
export function weekStart(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  const d = new Date(`${parts}T12:00:00Z`);
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (dow - 1));
  return d.toISOString().slice(0, 10);
}

/** Convierte un enlace de YouTube/Vimeo a su URL embebible; otros enlaces se devuelven tal cual. */
export function embedUrl(url: string): { kind: "iframe" | "video"; src: string } {
  try {
    const u = new URL(url.trim());
    const h = u.hostname.replace(/^www\./, "");
    if (h.endsWith("youtube.com")) {
      const id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/)?.[1];
      if (id) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${id}` };
    }
    if (h === "youtu.be") return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed${u.pathname}` };
    if (h.endsWith("vimeo.com")) {
      const m = u.pathname.match(/^\/(?:video\/)?(\d+)(?:\/([\w]+))?/);
      if (m) return { kind: "iframe", src: `https://player.vimeo.com/video/${m[1]}${m[2] ? `?h=${m[2]}` : u.searchParams.get("h") ? `?h=${u.searchParams.get("h")}` : ""}` };
    }
    if (h.endsWith("loom.com")) {
      const id = u.pathname.match(/^\/(?:share|embed)\/([\w]+)/)?.[1];
      if (id) return { kind: "iframe", src: `https://www.loom.com/embed/${id}` };
    }
    if (h === "drive.google.com") {
      const id = u.pathname.match(/\/file\/d\/([\w-]+)/)?.[1] ?? u.searchParams.get("id");
      if (id) return { kind: "iframe", src: `https://drive.google.com/file/d/${id}/preview` };
    }
    if (/\.(mp4|webm|mov)$/i.test(u.pathname)) return { kind: "video", src: url };
    return { kind: "iframe", src: url };
  } catch {
    return { kind: "iframe", src: url };
  }
}

/** Nombre de archivo seguro para Storage. */
export function safeFileName(name: string): string {
  const base = name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-80);
  return base || "archivo";
}
