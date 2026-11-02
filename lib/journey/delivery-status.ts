/** Estado de entrega de una persona en una etapa (para el tablero de la Wave). */
export type DeliveryState = "approved" | "not_approved" | "pending" | "missing";

export const DELIVERY_STATE: Record<DeliveryState, { label: string; tone: "ok" | "warn" | "info" | "bad" }> = {
  approved: { label: "Entregado y aprobado", tone: "ok" },
  not_approved: { label: "Entregado · no cumple", tone: "warn" },
  pending: { label: "Entregado · por revisar", tone: "info" },
  missing: { label: "No entregado", tone: "bad" },
};

/**
 * `subs`: entregas de la persona en las tareas de la etapa. `required`: tareas obligatorias (si no hay, cuenta
 * cualquier tarea). Verde solo si todas las obligatorias tienen su último intento aprobado.
 */
export function deliveryState(subs: { capsule_id: string; attempt: number; status: string }[], required: string[]): DeliveryState {
  if (!subs.length) return "missing";
  const last = new Map<string, string>();
  for (const s of [...subs].sort((a, b) => a.attempt - b.attempt)) last.set(s.capsule_id, s.status);
  const latest = [...last.values()];
  if (latest.includes("NOT_APPROVED")) return "not_approved";
  if (latest.some((x) => x === "SUBMITTED" || x === "HUMAN_REVIEW")) return "pending";
  const done = required.length ? required.every((id) => last.get(id) === "APPROVED") : latest.includes("APPROVED");
  return done ? "approved" : "missing";
}
