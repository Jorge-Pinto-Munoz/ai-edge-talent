/** Ventana de postulación de una Wave: abierta, programada (aún no inicia) o cerrada. Puro, para probarlo. */
export type WindowState = "open" | "scheduled" | "closed";
export interface WaveWindow { application_opens_at?: string | null; application_deadline: string | null }

export function applicationWindow(w: WaveWindow, now = Date.now()): WindowState {
  if (w.application_opens_at && Date.parse(w.application_opens_at) > now) return "scheduled";
  if (w.application_deadline && Date.parse(w.application_deadline) < now) return "closed";
  return "open";
}

export const WINDOW_LABEL: Record<WindowState, string> = { open: "Abiertas", scheduled: "Programadas", closed: "Cerradas" };
