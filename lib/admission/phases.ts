/**
 * Admisión en cuatro fases (Postulación → Assessment → Decisión → Incorporación).
 *
 * La base guarda un único estado por candidato (AdmissionStatus) con transiciones validadas; aquí se deriva, sin
 * migrar datos, el estado de cada fase. Así un candidato puede tener "Postulación enviada" y "Assessment evaluado" a
 * la vez: son hitos de fases distintas, no alternativas. Cada estado del sistema cae en exactamente un valor por fase.
 */
import type { AdmissionStatus } from "@/lib/domain/types";

export type PhaseKey = "postulacion" | "assessment" | "decision" | "incorporacion";
export type PhaseState =
  | "sin_iniciar" | "iniciada" | "enviada"
  | "assessment_pendiente" | "assessment_en_curso" | "assessment_evaluado"
  | "decision_pendiente" | "seleccionado" | "no_seleccionado"
  | "inscripcion_pendiente" | "inscrito";

export const PHASES: { key: PhaseKey; label: string; states: PhaseState[] }[] = [
  { key: "postulacion", label: "Postulación", states: ["sin_iniciar", "iniciada", "enviada"] },
  { key: "assessment", label: "Assessment", states: ["assessment_pendiente", "assessment_en_curso", "assessment_evaluado"] },
  { key: "decision", label: "Decisión", states: ["decision_pendiente", "seleccionado", "no_seleccionado"] },
  { key: "incorporacion", label: "Incorporación", states: ["inscripcion_pendiente", "inscrito"] },
];

/** Etiqueta, tono de color y significado de cada estado (los mismos en tabla, filtros y detalle). */
export const PHASE_STATE: Record<PhaseState, { label: string; tone: string; hint: string }> = {
  sin_iniciar: { label: "Sin iniciar", tone: "slate", hint: "Invitado o nominado; aún no se registra." },
  iniciada: { label: "Postulación iniciada", tone: "slate", hint: "Comenzó, pero no ha enviado su postulación." },
  enviada: { label: "Postulación enviada", tone: "cyan", hint: "Completó y envió el formulario." },
  assessment_pendiente: { label: "Assessment pendiente", tone: "amber", hint: "Postulación recibida; falta evaluar el Assessment." },
  assessment_en_curso: { label: "Assessment en curso", tone: "violet", hint: "La evaluación está en revisión humana o en repechaje por video." },
  assessment_evaluado: { label: "Assessment evaluado", tone: "teal", hint: "Existe un resultado válido del Assessment." },
  decision_pendiente: { label: "Decisión pendiente", tone: "amber", hint: "Tiene resultado; falta la decisión humana." },
  seleccionado: { label: "Seleccionado", tone: "green", hint: "Fue aceptado para continuar." },
  no_seleccionado: { label: "No seleccionado", tone: "gray", hint: "No continúa en esta Wave." },
  inscripcion_pendiente: { label: "Inscripción pendiente", tone: "blue", hint: "Seleccionado; falta aceptar el compromiso para incorporarse." },
  inscrito: { label: "Inscrito", tone: "green", hint: "Aceptó el compromiso y está en el programa." },
};

const NOT_STARTED = ["NOMINATED", "INVITED"];
const STARTED = ["IDENTIFIED", "APPLICATION_STARTED"];
const IN_REVIEW = ["HUMAN_REVIEW", "RESCUE_REQUIRED"];
const SELECTED_PENDING = ["SELECTED", "CONDITIONS_PENDING"];
const ENROLLED = ["CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"];

export interface Phases {
  postulacion: PhaseState;
  assessment: PhaseState | null;
  decision: PhaseState | null;
  incorporacion: PhaseState | null;
  /** Fase en la que está hoy (la más avanzada que alcanzó). */
  current: PhaseKey;
}

/** Estado de cada fase a partir del estado del sistema. Las fases que aún no alcanza quedan en null. */
export function phasesOf(status: AdmissionStatus | string): Phases {
  if (NOT_STARTED.includes(status)) return { postulacion: "sin_iniciar", assessment: null, decision: null, incorporacion: null, current: "postulacion" };
  if (STARTED.includes(status)) return { postulacion: "iniciada", assessment: null, decision: null, incorporacion: null, current: "postulacion" };
  if (status === "APPLICATION_SUBMITTED") return { postulacion: "enviada", assessment: "assessment_pendiente", decision: null, incorporacion: null, current: "assessment" };
  if (IN_REVIEW.includes(status)) return { postulacion: "enviada", assessment: "assessment_en_curso", decision: "decision_pendiente", incorporacion: null, current: "assessment" };
  if (status === "ASSESSMENT_EVALUATED") return { postulacion: "enviada", assessment: "assessment_evaluado", decision: "decision_pendiente", incorporacion: null, current: "decision" };
  if (status === "NOT_SELECTED") return { postulacion: "enviada", assessment: "assessment_evaluado", decision: "no_seleccionado", incorporacion: null, current: "decision" };
  if (SELECTED_PENDING.includes(status)) return { postulacion: "enviada", assessment: "assessment_evaluado", decision: "seleccionado", incorporacion: "inscripcion_pendiente", current: "incorporacion" };
  if (ENROLLED.includes(status)) return { postulacion: "enviada", assessment: "assessment_evaluado", decision: "seleccionado", incorporacion: "inscrito", current: "incorporacion" };
  return { postulacion: "sin_iniciar", assessment: null, decision: null, incorporacion: null, current: "postulacion" };
}

/** ¿Hay algo que el equipo deba hacer ahora? (evaluar, decidir o completar la inscripción). */
export function needsAction(status: string): boolean {
  const p = phasesOf(status);
  return p.assessment === "assessment_pendiente" || p.decision === "decision_pendiente" || p.incorporacion === "inscripcion_pendiente";
}

/** Indicadores de la Wave. Cada persona cuenta una vez por indicador. */
export function admissionCounts(statuses: string[]) {
  const ps = statuses.map(phasesOf);
  const n = (f: (p: Phases) => boolean) => ps.filter(f).length;
  return {
    total: ps.length,
    started: n((p) => p.postulacion === "iniciada"),
    notStarted: n((p) => p.postulacion === "sin_iniciar"),
    submitted: n((p) => p.postulacion === "enviada"),
    assessmentPending: n((p) => p.assessment === "assessment_pendiente"),
    assessmentInProgress: n((p) => p.assessment === "assessment_en_curso"),
    evaluated: n((p) => p.assessment === "assessment_evaluado"),
    decisionPending: n((p) => p.decision === "decision_pendiente"),
    selected: n((p) => p.decision === "seleccionado"),
    notSelected: n((p) => p.decision === "no_seleccionado"),
    enrollPending: n((p) => p.incorporacion === "inscripcion_pendiente"),
    enrolled: n((p) => p.incorporacion === "inscrito"),
    needsAction: statuses.filter(needsAction).length,
  };
}

/** Referencia de profesionales por Wave (indicador de planificación, no un límite). */
export const DEFAULT_REFERENCE = 15;

/** Seleccionados respecto de la referencia: la barra llega al 100 % y el excedente se informa aparte. */
export function capacityView(selected: number, reference: number) {
  const ref = Math.max(1, Math.round(reference));
  return {
    reference: ref,
    selected,
    pct: Math.min(100, Math.round((selected / ref) * 100)),
    available: Math.max(0, ref - selected),
    over: Math.max(0, selected - ref),
    reached: selected >= ref,
  };
}
