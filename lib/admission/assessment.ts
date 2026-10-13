/** Reglas del formulario de Assessment (sin dependencias: se usan en servidor, cliente y pruebas). */

export type AssessmentState = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export const ASSESSMENT_STATE_LABEL: Record<AssessmentState, string> = {
  NOT_STARTED: "No iniciado",
  IN_PROGRESS: "En progreso",
  COMPLETED: "Completado",
};

const BEFORE = ["NOMINATED", "INVITED", "IDENTIFIED"];

/**
 * Estado del Assessment según la postulación. Un borrador guardado es "En progreso": nunca cuenta como evaluación
 * finalizada ni hace avanzar de etapa. Solo el envío definitivo (submitted_at) lo deja "Completado".
 */
export function assessmentState(status: string, submittedAt?: string | null): AssessmentState {
  if (submittedAt) return "COMPLETED";
  if (BEFORE.includes(status)) return "NOT_STARTED";
  if (status === "APPLICATION_STARTED") return "IN_PROGRESS";
  return "COMPLETED";
}

export interface Question { id: string; required: boolean; kind?: string; options?: string[] | null }

/** Respuestas limpias: solo preguntas del formulario, texto acotado y opciones válidas. */
export function cleanAnswers(qs: Question[], answers: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    qs.map((q) => {
      const v = typeof answers[q.id] === "string" ? (answers[q.id] as string).slice(0, 8000) : "";
      if (q.kind === "single_choice" && v && q.options && !q.options.includes(v)) return [q.id, ""];
      return [q.id, v];
    }),
  );
}

export const isAnswered = (v: string | undefined) => Boolean(v && v.trim());
export const answeredCount = (qs: Question[], a: Record<string, string>) => qs.filter((q) => isAnswered(a[q.id])).length;
/** Obligatorias sin responder (solo se exigen al enviar, nunca para guardar un borrador). */
export const missingRequired = (qs: Question[], a: Record<string, string>) => qs.filter((q) => q.required && !isAnswered(a[q.id])).map((q) => q.id);
/** Primera pregunta pendiente, para retomar donde quedó. */
export const firstPending = (qs: Question[], a: Record<string, string>) => qs.find((q) => !isAnswered(a[q.id]))?.id ?? null;
