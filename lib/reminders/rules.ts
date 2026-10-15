/**
 * Reglas de recordatorios de pulsos de cierre (puras; tests en tests/recordatorios.test.ts).
 * Un recordatorio cada `every_days` desde que se cumplieron los requisitos, hasta `max`; el Delivery recibe un aviso
 * único a los `delivery_after_days`. Sin duplicados: cada envío se "reserva" con una actualización condicionada.
 */
export interface ReminderSettings { every_days: number; max: number; delivery_after_days: number }
export const DEFAULT_REMINDERS: ReminderSettings = { every_days: 3, max: 3, delivery_after_days: 5 };

export interface PendingClosure {
  requirements_met_at: string;
  last_reminder_at: string | null;
  reminders_sent: number;
  delivery_alerted_at: string | null;
}

const DAY = 86_400_000;

export function reminderDue(c: PendingClosure, s: ReminderSettings, now: Date): boolean {
  if (c.reminders_sent >= s.max) return false;
  const from = new Date(c.last_reminder_at ?? c.requirements_met_at).getTime();
  return now.getTime() - from >= s.every_days * DAY;
}

export function deliveryAlertDue(c: PendingClosure, s: ReminderSettings, now: Date, hasDelivery: boolean): boolean {
  return hasDelivery && !c.delivery_alerted_at && now.getTime() - new Date(c.requirements_met_at).getTime() >= s.delivery_after_days * DAY;
}

/** Plantillas cuyo cuerpo guardado puede reenviarse tal cual (las que llevan código no: el código se guarda enmascarado). */
export const RETRYABLE = new Set(["PULSE_REMINDER", "DELIVERY_PULSE_ALERT", "ACCESS_UPDATED", "ACCESS_REQUEST_ADMIN", "ACCESS_REQUEST_REJECTED", "SELECTED_WELCOME", "RESCUE_INVITE", "RESCUE_SUBMITTED_ADMIN", "STAGE_OPEN", "DELIVERY_DECISION"]);
export const MAX_EMAIL_ATTEMPTS = 3;
