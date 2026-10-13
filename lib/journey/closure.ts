/**
 * Cierre de etapa (decisión de producto, ver docs/decisiones/pulsos-de-cierre.md):
 *   requisitos académicos cumplidos → pulso de cierre habilitado → pulso respondido → etapa cerrada → siguiente desbloqueada.
 * El pulso NO reemplaza los gates académicos: solo se habilita cuando ya se cumplieron (o el admin los dio por
 * cumplidos con una excepción registrada). Funciones puras: se prueban en tests/cierre.test.ts.
 */
import { LAYERS, layerIndex, type Layer } from "./rules";

/** Pulso obligatorio que cierra cada etapa. Assessment no tiene: se cierra con la inscripción. */
export const CLOSING_PULSE: Record<Layer, string | null> = {
  ASSESSMENT: null,
  AI_MINDSET: "MINDSET",
  ROLE_ENABLEMENT: "HAB_CIERRE",
  AI_LAB_SHOWCASE: "LAB",
  CLOSURE: "FINAL",
};
export const closingLayerOf = (pulse: string): Layer | null => (Object.entries(CLOSING_PULSE).find(([, p]) => p === pulse)?.[0] as Layer) ?? null;
export const nextLayer = (l: Layer): Layer | null => LAYERS[layerIndex(l) + 1]?.id ?? null;

export interface RequirementInput {
  capsules: { id: string; layer: Layer; task_prompt: string | null; task_required: boolean; max_attempts?: number | null }[];
  submissions: { capsule_id: string; status: string; attempt: number }[];
  certifications: { result: string; status: string }[];
  labStatus: string | null;
  /** El admin dio los requisitos por cumplidos con una excepción registrada. */
  byException?: boolean;
}
export interface Requirement { id: string; label: string; done: boolean; review?: boolean }

/** Requisitos académicos de una etapa, en el lenguaje del profesional. */
export function stageRequirements(layer: Layer, x: RequirementInput): { met: boolean; items: Requirement[]; byException: boolean } {
  let items: Requirement[] = [];
  switch (layer) {
    case "AI_MINDSET": {
      const req = x.capsules.filter((c) => c.layer === "AI_MINDSET" && c.task_prompt && c.task_required);
      items = req.map((c) => {
        const mine = x.submissions.filter((s) => s.capsule_id === c.id);
        return { id: `task-${c.id}`, label: "Desafío evaluado aprobado", done: mine.some((s) => s.status === "APPROVED"), review: mine.some((s) => s.status === "SUBMITTED" || s.status === "HUMAN_REVIEW") };
      });
      if (items.length > 1) items = items.map((it, i) => ({ ...it, label: `Tarea obligatoria ${i + 1} aprobada` }));
      // Sin tareas obligatorias publicadas no hay cómo cumplir: la etapa espera a que el equipo las publique.
      if (!items.length) items = [{ id: "task-none", label: "Desafío evaluado publicado y aprobado", done: false }];
      break;
    }
    case "ROLE_ENABLEMENT":
      items = [{
        id: "cert",
        label: "Certificación AI CERT aprobada y verificada",
        done: x.certifications.some((c) => c.result === "PASSED" && c.status === "VERIFIED"),
        review: x.certifications.some((c) => c.status === "PENDING_REVIEW"),
      }];
      break;
    case "AI_LAB_SHOWCASE":
      items = [{ id: "showcase", label: "Caso presentado en el Showcase", done: x.labStatus === "PRESENTED" }];
      break;
    case "CLOSURE":
    case "ASSESSMENT":
      items = [];
  }
  const byException = Boolean(x.byException) && items.some((i) => !i.done);
  return { met: byException || items.every((i) => i.done), items, byException };
}

/** Estados de etapa que ve el profesional (y el equipo). Progreso académico ≠ cierre administrativo. */
export type StageStatus = "LOCKED" | "AVAILABLE" | "IN_PROGRESS" | "ACADEMIC_PENDING" | "REQUIREMENTS_MET" | "PULSE_PENDING" | "CLOSED" | "ATTENTION";
export const STAGE_STATUS: Record<StageStatus, { label: string; tone: "muted" | "info" | "progress" | "review" | "done" | "attention" }> = {
  LOCKED: { label: "Bloqueada", tone: "muted" },
  AVAILABLE: { label: "Disponible", tone: "info" },
  IN_PROGRESS: { label: "En curso", tone: "progress" },
  ACADEMIC_PENDING: { label: "Requisitos académicos pendientes", tone: "review" },
  REQUIREMENTS_MET: { label: "Requisitos completados", tone: "done" },
  PULSE_PENDING: { label: "Pulso pendiente", tone: "attention" },
  CLOSED: { label: "Etapa cerrada", tone: "done" },
  ATTENTION: { label: "Requiere atención", tone: "attention" },
};

export interface StageStatusInput extends RequirementInput {
  current: Layer | null;
  layer: Layer;
  answered: string[];
  /** Hubo actividad en la etapa (cápsulas vistas, entregas, registros). */
  started: boolean;
  closedAt?: string | null;
  /** Requisitos cumplidos hace N días sin pulso (para escalar a "Requiere atención"). */
  pulseWaitDays?: number | null;
  attentionAfterDays?: number;
}

/** Estado de una etapa para una persona. */
export function stageStatus(x: StageStatusInput): StageStatus {
  const i = layerIndex(x.layer);
  const cur = layerIndex(x.current === null || x.current === "ASSESSMENT" ? "AI_MINDSET" : x.current);
  if (x.layer === "ASSESSMENT") return "CLOSED";
  if (i > cur) return "LOCKED";
  if (i < cur || x.closedAt) return "CLOSED";
  const pulse = CLOSING_PULSE[x.layer];
  const req = stageRequirements(x.layer, x);
  const blocked = attentionReason(x.layer, x);
  if (req.met) {
    if (pulse && !x.answered.includes(pulse)) {
      return x.pulseWaitDays != null && x.pulseWaitDays >= (x.attentionAfterDays ?? 7) ? "ATTENTION" : "PULSE_PENDING";
    }
    return x.layer === "CLOSURE" && pulse && x.answered.includes(pulse) ? "CLOSED" : "REQUIREMENTS_MET";
  }
  if (blocked) return "ATTENTION";
  if (req.items.some((r) => r.review)) return "ACADEMIC_PENDING";
  return x.started ? "IN_PROGRESS" : "AVAILABLE";
}

/** Bloqueos que el profesional no puede resolver solo: intentos agotados o segundo examen no aprobado. */
export function attentionReason(layer: Layer, x: RequirementInput): string | null {
  if (layer === "AI_MINDSET") {
    for (const c of x.capsules.filter((k) => k.layer === "AI_MINDSET" && k.task_prompt && k.task_required)) {
      const mine = x.submissions.filter((s) => s.capsule_id === c.id);
      const failed = mine.filter((s) => s.status === "NOT_APPROVED").length;
      if (!mine.some((s) => s.status === "APPROVED") && c.max_attempts && failed >= c.max_attempts) return "Usó todos los intentos del desafío evaluado.";
    }
  }
  if (layer === "ROLE_ENABLEMENT") {
    const failed = x.certifications.filter((c) => c.result === "FAILED" && c.status === "VERIFIED").length;
    if (failed >= 2 && !x.certifications.some((c) => c.result === "PASSED" && c.status === "VERIFIED")) return "Dos intentos de examen no aprobados.";
  }
  return null;
}

/** ¿Se puede cerrar la etapa actual? Requisitos (o excepción) + pulso de cierre respondido. */
export function closureDecision(layer: Layer, x: RequirementInput & { answered: string[] }): { close: boolean; next: Layer | null; missing: "requirements" | "pulse" | null } {
  const req = stageRequirements(layer, x);
  const pulse = CLOSING_PULSE[layer];
  if (!req.met) return { close: false, next: null, missing: "requirements" };
  if (pulse && !x.answered.includes(pulse)) return { close: false, next: null, missing: "pulse" };
  return { close: true, next: nextLayer(layer), missing: null };
}
