import type { AdmissionStatus, AssessmentOutcome } from "./types";

/**
 * Máquina de estados de admisión.
 * Postular ≠ seleccionado. Seleccionado ≠ inscrito.
 * ENROLLED solo se alcanza desde CONDITIONS_ACCEPTED.
 */
export const ADMISSION_TRANSITIONS: Record<AdmissionStatus, AdmissionStatus[]> = {
  NOMINATED: ["INVITED"],
  INVITED: ["IDENTIFIED"],
  IDENTIFIED: ["APPLICATION_STARTED"],
  APPLICATION_STARTED: ["APPLICATION_SUBMITTED"],
  APPLICATION_SUBMITTED: ["ASSESSMENT_EVALUATED", "HUMAN_REVIEW"],
  ASSESSMENT_EVALUATED: ["SELECTED", "RESCUE_REQUIRED", "NOT_SELECTED", "HUMAN_REVIEW"],
  HUMAN_REVIEW: ["SELECTED", "RESCUE_REQUIRED", "NOT_SELECTED"],
  RESCUE_REQUIRED: ["SELECTED", "NOT_SELECTED", "HUMAN_REVIEW"],
  NOT_SELECTED: [],
  SELECTED: ["CONDITIONS_PENDING"],
  CONDITIONS_PENDING: ["CONDITIONS_ACCEPTED"],
  CONDITIONS_ACCEPTED: ["ENROLLED"],
  ENROLLED: ["MINDSET_READY"],
  MINDSET_READY: [],
};

/** Orden lineal de referencia para barras de progreso (las ramas se ubican en su punto). */
export const ADMISSION_PIPELINE: AdmissionStatus[] = [
  "NOMINATED",
  "INVITED",
  "IDENTIFIED",
  "APPLICATION_STARTED",
  "APPLICATION_SUBMITTED",
  "ASSESSMENT_EVALUATED",
  "SELECTED",
  "CONDITIONS_PENDING",
  "CONDITIONS_ACCEPTED",
  "ENROLLED",
  "MINDSET_READY",
];

export class TransitionError extends Error {}

export function canTransition(from: AdmissionStatus, to: AdmissionStatus): boolean {
  return ADMISSION_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: AdmissionStatus, to: AdmissionStatus): void {
  if (!canTransition(from, to)) {
    throw new TransitionError(`Transición no permitida: ${from} → ${to}`);
  }
}

/**
 * Ruta de estados para registrar un resultado de Assessment desde el estado actual.
 * Devuelve la secuencia de estados intermedios + final (cada uno queda como evento).
 */
export function outcomePath(from: AdmissionStatus, outcome: AssessmentOutcome): AdmissionStatus[] {
  if (from === "APPLICATION_SUBMITTED") {
    return outcome === "HUMAN_REVIEW" ? ["HUMAN_REVIEW"] : ["ASSESSMENT_EVALUATED", outcome];
  }
  if (from === "ASSESSMENT_EVALUATED" || from === "HUMAN_REVIEW" || from === "RESCUE_REQUIRED") {
    assertTransition(from, outcome);
    return [outcome];
  }
  throw new TransitionError(`No se puede registrar resultado desde ${from}`);
}

/** ¿Está la persona formalmente inscrita? (no basta con estar seleccionada) */
export function isEnrolled(status: AdmissionStatus): boolean {
  return status === "ENROLLED" || status === "MINDSET_READY";
}

/** ¿Ya envió su postulación? */
export function hasSubmitted(status: AdmissionStatus): boolean {
  const idx = ADMISSION_PIPELINE.indexOf(status);
  return (
    ["HUMAN_REVIEW", "RESCUE_REQUIRED", "NOT_SELECTED"].includes(status) ||
    idx >= ADMISSION_PIPELINE.indexOf("APPLICATION_SUBMITTED")
  );
}

/**
 * Proyección de visibilidad para el CLIENTE.
 * El cliente ve: postulación pendiente/completada y avance / no avance / rescate.
 * No ve ranking, puntajes ni evaluación detallada.
 */
export type ClientVisibleStatus =
  | "NOMINADO"
  | "INVITADO"
  | "POSTULACION_PENDIENTE"
  | "POSTULACION_COMPLETADA"
  | "RESCATE"
  | "AVANZA"
  | "NO_AVANZA"
  | "INSCRITO";

export const CLIENT_VISIBLE_LABEL: Record<ClientVisibleStatus, string> = {
  NOMINADO: "Nominado/a",
  INVITADO: "Invitado/a a postular",
  POSTULACION_PENDIENTE: "Postulación pendiente",
  POSTULACION_COMPLETADA: "Postulación completada · en evaluación",
  RESCATE: "Complementa su postulación (rescate)",
  AVANZA: "Avanza",
  NO_AVANZA: "No avanza en esta Wave",
  INSCRITO: "Inscrito/a en la Wave",
};

export function toClientVisible(status: AdmissionStatus): ClientVisibleStatus {
  switch (status) {
    case "NOMINATED":
      return "NOMINADO";
    case "INVITED":
      return "INVITADO";
    case "IDENTIFIED":
    case "APPLICATION_STARTED":
      return "POSTULACION_PENDIENTE";
    case "APPLICATION_SUBMITTED":
    case "ASSESSMENT_EVALUATED":
    case "HUMAN_REVIEW":
      return "POSTULACION_COMPLETADA";
    case "RESCUE_REQUIRED":
      return "RESCATE";
    case "NOT_SELECTED":
      return "NO_AVANZA";
    case "SELECTED":
    case "CONDITIONS_PENDING":
    case "CONDITIONS_ACCEPTED":
      return "AVANZA";
    case "ENROLLED":
    case "MINDSET_READY":
      return "INSCRITO";
  }
}
