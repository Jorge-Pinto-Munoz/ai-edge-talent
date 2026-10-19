/**
 * Cola de admisión: estado compacto, prioridad y acción principal de cada candidato en la tabla de Admisión.
 * Puro (sin acceso a datos) para poder probarlo. La decisión siempre es humana: la acción principal solo abre el
 * panel donde se decide con confirmación.
 */
import { rescueState, type RescueState } from "./rescue";

export type QueueChip = "todos" | "decision" | "postulacion" | "assessment" | "seleccionados" | "no_seleccionados" | "rescate";

export const QUEUE_CHIPS: { key: QueueChip; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "decision", label: "Requieren decisión" },
  { key: "postulacion", label: "En postulación" },
  { key: "assessment", label: "En Assessment" },
  { key: "seleccionados", label: "Seleccionados" },
  { key: "no_seleccionados", label: "No seleccionados" },
  { key: "rescate", label: "En rescate" },
];

export type Tone = "slate" | "cyan" | "amber" | "violet" | "teal" | "green" | "gray" | "blue" | "red";
export type BadgeIcon = "alert" | "play" | "check" | null;
export type PrimaryAction = "evaluate_ai" | "review" | "review_rescue" | "decide_expired" | null;

export interface QueueInput {
  status: string;
  hasEval: boolean;
  rescue: { expires_at: string | null; started_at: string | null; submitted_at: string | null; reviewed_at: string | null } | null;
  emailFailed?: boolean;
}

export interface QueueView {
  badge: { label: string; tone: Tone; icon: BadgeIcon };
  /** 1 = primero (rescate enviado por revisar) … 6 = cerrados. */
  priority: 1 | 2 | 3 | 4 | 5 | 6;
  primary: PrimaryAction;
  chips: QueueChip[];
  rescue: RescueState;
  /** Próximo paso en palabras (lo que ve Delivery, que no tiene acciones). */
  next: string;
}

const APPLYING = ["NOMINATED", "INVITED", "IDENTIFIED", "APPLICATION_STARTED"];
const SELECTED = ["SELECTED", "CONDITIONS_PENDING"];
const ENROLLED = ["CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"];

export const PRIMARY_LABEL: Record<Exclude<PrimaryAction, null>, string> = {
  evaluate_ai: "Reintentar evaluación",
  review: "Seleccionar",
  review_rescue: "Revisar video",
  decide_expired: "Decidir",
};

export function queueView(c: QueueInput, now = new Date()): QueueView {
  const rescue = rescueState(
    { status: c.status, invitation: c.rescue ? { expires_at: c.rescue.expires_at, started_at: c.rescue.started_at } : null, video: c.rescue?.submitted_at ? { submitted_at: c.rescue.submitted_at, reviewed_at: c.rescue.reviewed_at } : null },
    now,
  );
  const withRescue = (chips: QueueChip[]) => (c.rescue ? [...chips, "rescate" as const] : chips);
  const s = c.status;

  if (s === "RESCUE_REQUIRED") {
    if (rescue === "submitted" || rescue === "in_review")
      return { badge: { label: "Rescate enviado", tone: "violet", icon: "play" }, priority: 1, primary: "review_rescue", chips: ["decision", "rescate"], rescue, next: "Revisar el video y decidir" };
    if (rescue === "expired")
      return { badge: { label: "Rescate vencido", tone: "violet", icon: "alert" }, priority: 3, primary: "decide_expired", chips: ["decision", "rescate"], rescue, next: "Cerrar o extender el plazo" };
    return { badge: { label: "Rescate activo", tone: "violet", icon: null }, priority: 4, primary: null, chips: ["rescate"], rescue, next: "Esperando el video (plazo de 24 h)" };
  }
  if (s === "ASSESSMENT_EVALUATED" || s === "HUMAN_REVIEW")
    return { badge: { label: s === "HUMAN_REVIEW" ? "Revisión humana" : "Assessment evaluado", tone: "blue", icon: null }, priority: 2, primary: c.hasEval ? "review" : "evaluate_ai", chips: withRescue(["decision", "assessment"]), rescue, next: "Decisión del equipo" };
  if (s === "APPLICATION_SUBMITTED")
    return { badge: { label: "Postulación enviada", tone: "slate", icon: null }, priority: 3, primary: "evaluate_ai", chips: ["assessment"], rescue, next: "Evaluar el Assessment" };
  if (APPLYING.includes(s))
    return { badge: s === "NOMINATED" || s === "INVITED" ? { label: "Invitado", tone: "gray", icon: null } : { label: "Postulando", tone: "amber", icon: "alert" }, priority: 4, primary: null, chips: ["postulacion"], rescue, next: "Completar y enviar su postulación" };
  if (SELECTED.includes(s))
    return { badge: { label: "Seleccionado", tone: "green", icon: null }, priority: c.emailFailed ? 3 : 5, primary: null, chips: withRescue(["seleccionados"]), rescue, next: c.emailFailed ? "Reintentar el correo de bienvenida" : "Aceptar su compromiso" };
  if (ENROLLED.includes(s))
    return { badge: { label: "Inscrito", tone: "green", icon: "check" }, priority: 5, primary: null, chips: withRescue(["seleccionados"]), rescue, next: "En el programa" };
  if (s === "NOT_SELECTED")
    return { badge: { label: "No seleccionado", tone: "red", icon: null }, priority: 6, primary: null, chips: withRescue(["no_seleccionados"]), rescue, next: "Proceso cerrado" };
  return { badge: { label: s, tone: "slate", icon: null }, priority: 4, primary: null, chips: [], rescue, next: "—" };
}

/** Filtro inicial desde la URL: ?filtro=rescate|decision|… o, por compatibilidad, ?estado=<estado del sistema>. */
export function chipFromParams(filtro?: string, estado?: string): QueueChip {
  if (filtro && QUEUE_CHIPS.some((c) => c.key === filtro)) return filtro as QueueChip;
  if (!estado) return "todos";
  if (estado === "RESCUE_REQUIRED") return "rescate";
  if (["ASSESSMENT_EVALUATED", "HUMAN_REVIEW"].includes(estado)) return "decision";
  if (estado === "APPLICATION_SUBMITTED") return "assessment";
  if (estado === "NOT_SELECTED") return "no_seleccionados";
  if (["SELECTED", "CONDITIONS_PENDING", "CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"].includes(estado)) return "seleccionados";
  return "postulacion";
}


/** Color del puntaje según el nivel oficial de la rúbrica (A/B aptos, C con seguimiento, D bajo el corte). */
export function scoreTone(level: string | null | undefined): "good" | "mid" | "low" | null {
  if (!level) return null;
  return level === "A" || level === "B" ? "good" : level === "C" ? "mid" : "low";
}

const REC_TEXT: Record<string, string> = {
  SELECCIONAR: "Seleccionar",
  SELECCIONAR_CON_SEGUIMIENTO: "Seleccionar con seguimiento",
  EVALUAR_CUPO_Y_SEGUIMIENTO: "Evaluar cupo y seguimiento",
  ACTIVAR_RESCATE: "Ofrecer rescate",
  SELECTED: "Seleccionar",
  RESCUE_REQUIRED: "Ofrecer rescate",
  HUMAN_REVIEW: "Revisión humana",
  NOT_SELECTED: "No seleccionar",
};

/** Recomendación breve de la rúbrica (orienta; la decisión es humana). Con video de rescate recibido: revisarlo. */
export function recommendationText(e: { recommendation: string; pl: string | null } | null, rescue: QueueView["rescue"]): string {
  if (rescue === "submitted" || rescue === "in_review") return "Revisar rescate";
  if (!e) return "Sin evaluación";
  return REC_TEXT[e.pl ?? ""] ?? REC_TEXT[e.recommendation] ?? "Sin evaluación";
}

/** Siguiente paso de admisión según el estado y la recomendación de la rúbrica (orienta; la decisión es humana). */
export type NextStep = "select" | "rescue" | "reject" | "review" | "review_rescue" | "decide_expired" | "retry_eval" | null;

export const NEXT_LABEL: Record<Exclude<NextStep, null>, string> = {
  select: "Seleccionar",
  rescue: "Ofrecer rescate",
  reject: "No seleccionar",
  review: "Revisión humana",
  review_rescue: "Revisar video de rescate",
  decide_expired: "Decidir rescate vencido",
  retry_eval: "Reintentar evaluación",
};

export function nextStep(c: { status: string; eval: { level: string; recommendation: string; pl: string | null } | null; hadRescue: boolean }, v: Pick<QueueView, "primary">): NextStep {
  if (v.primary === "review_rescue" || v.primary === "decide_expired") return v.primary;
  if (v.primary === "evaluate_ai") return "retry_eval";
  if (v.primary !== "review" || !c.eval) return null;
  const rec = c.eval.pl ?? c.eval.recommendation;
  if (rec === "NOT_SELECTED") return "reject";
  if (rec === "ACTIVAR_RESCATE" || rec === "RESCUE_REQUIRED" || c.eval.level === "D") return c.hadRescue ? "reject" : "rescue";
  if (rec === "HUMAN_REVIEW") return "review";
  return "select";
}
