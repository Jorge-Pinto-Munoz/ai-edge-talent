/** Estado de apertura de una etapa por Wave (compartido entre servidor y cliente). */
export type OpeningStatus = "closed" | "scheduled" | "open" | "finished";
export const OPENING_LABEL: Record<OpeningStatus, string> = { closed: "Cerrada", scheduled: "Programada", open: "Abierta", finished: "Finalizada" };

/** Cerrada (sin fecha), Programada (fecha futura), Abierta, o Finalizada (todos ya pasaron a la etapa siguiente). */
export function openingStatus(opensAt: string | null, inStage: number, enrolled: number, now = new Date()): OpeningStatus {
  if (!opensAt) return "closed";
  if (new Date(opensAt).getTime() > now.getTime()) return "scheduled";
  return enrolled > 0 && inStage === 0 ? "finished" : "open";
}

