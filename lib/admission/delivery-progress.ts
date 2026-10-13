import type { AdmissionStatus } from "@/lib/domain/types";

/** Avance de postulación que ve un Delivery: en palabras simples, con qué le toca hacer. */
export type Tone = "done" | "progress" | "attention" | "muted";
export interface AdmissionStep { label: string; detail: string; tone: Tone; order: number }

const STEP: Record<AdmissionStatus, AdmissionStep> = {
  NOMINATED: { label: "Nominado/a", detail: "Aún no se registra.", tone: "muted", order: 0 },
  INVITED: { label: "Invitado/a", detail: "Aún no se registra.", tone: "muted", order: 0 },
  IDENTIFIED: { label: "Registrado/a, sin empezar", detail: "Se registró pero no ha empezado el Assessment.", tone: "attention", order: 1 },
  APPLICATION_STARTED: { label: "Respondiendo, sin enviar", detail: "Empezó el Assessment y no lo ha enviado.", tone: "attention", order: 2 },
  APPLICATION_SUBMITTED: { label: "Assessment enviado", detail: "En evaluación.", tone: "progress", order: 3 },
  ASSESSMENT_EVALUATED: { label: "Assessment enviado", detail: "En evaluación.", tone: "progress", order: 3 },
  HUMAN_REVIEW: { label: "Assessment enviado", detail: "En revisión del equipo.", tone: "progress", order: 3 },
  RESCUE_REQUIRED: { label: "Video pendiente", detail: "Se le pidió un video corto para completar su evaluación.", tone: "attention", order: 4 },
  NOT_SELECTED: { label: "No seleccionado/a", detail: "Queda en la banca de talento para próximas Waves.", tone: "muted", order: 5 },
  SELECTED: { label: "Seleccionado/a, falta firmar", detail: "Debe aceptar su Carta de Compromiso para inscribirse.", tone: "attention", order: 6 },
  CONDITIONS_PENDING: { label: "Seleccionado/a, falta firmar", detail: "Debe aceptar su Carta de Compromiso para inscribirse.", tone: "attention", order: 6 },
  CONDITIONS_ACCEPTED: { label: "Firmó, inscrito/a", detail: "Ya está en el journey.", tone: "done", order: 7 },
  ENROLLED: { label: "En el journey", detail: "Ya está en el journey.", tone: "done", order: 7 },
  MINDSET_READY: { label: "En el journey", detail: "Ya está en el journey.", tone: "done", order: 7 },
};

/** Días sin movimiento antes de marcar a alguien como detenido mientras postula. */
export const STALLED_DAYS = 3;

export function admissionStep(status: AdmissionStatus, lastActivity: Date | null, now: Date): AdmissionStep & { stalled: boolean } {
  const s = STEP[status] ?? { label: status, detail: "", tone: "muted" as Tone, order: 9 };
  const pending = status === "IDENTIFIED" || status === "APPLICATION_STARTED";
  const stalled = pending && !!lastActivity && now.getTime() - lastActivity.getTime() > STALLED_DAYS * 86_400_000;
  return { ...s, stalled };
}
