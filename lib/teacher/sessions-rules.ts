/**
 * Role Enablement: siempre 4 sesiones con el profesor, una por semana (Semana 1 a 4).
 * Funciones puras (se prueban en tests/sesiones-role-enablement.test.ts).
 */
export const RE_SESSIONS = [1, 2, 3, 4] as const;
export type SessionN = (typeof RE_SESSIONS)[number];
export type Focus = "OK" | "LOW" | "HIGH";
export const FOCUS: { id: Focus; label: string; hint: string }[] = [
  { id: "OK", label: "Normal", hint: "Participó como se espera" },
  { id: "LOW", label: "Baja concentración", hint: "Se le vio desconectado/a o distraído/a" },
  { id: "HIGH", label: "Destacado/a", hint: "Participación sobresaliente" },
];
export type SessionFile = { name: string; path: string; size: number };

export interface SessionInput {
  waveId: string;
  n: number;
  heldOn: string;
  title: string;
  studentNotes: string;
  adminComments: string;
  materials: SessionFile[];
  attendance: { candidateId: string; attended: boolean; focus: Focus; note: string }[];
}

/** Valida y limpia lo que guarda el profesor. Lanza un error legible si algo no cuadra. */
export function cleanSession(x: SessionInput, today: string): SessionInput {
  if (!RE_SESSIONS.includes(x.n as SessionN)) throw new Error("Role Enablement tiene 4 sesiones (Semana 1 a 4).");
  if (x.heldOn && !/^\d{4}-\d{2}-\d{2}$/.test(x.heldOn)) throw new Error("Revisa la fecha de la sesión.");
  if (x.attendance.length && !x.heldOn) throw new Error("Indica la fecha de la sesión para registrar la asistencia.");
  if (x.attendance.length && x.heldOn > today) throw new Error("La asistencia se registra el día de la sesión o después.");
  if (x.materials.length > 10) throw new Error("Máximo 10 archivos por sesión.");
  for (const a of x.attendance) if (!FOCUS.some((f) => f.id === a.focus)) throw new Error("Concentración no válida.");
  return {
    ...x,
    title: x.title.trim().slice(0, 160),
    studentNotes: x.studentNotes.trim().slice(0, 4000),
    adminComments: x.adminComments.trim().slice(0, 4000),
    materials: x.materials.map((m) => ({ name: m.name.slice(0, 200), path: m.path, size: m.size })),
    attendance: x.attendance.map((a) => ({ ...a, note: a.note.trim().slice(0, 600) })),
  };
}

/** Cruce del check-in del profesional con la asistencia del profesor. */
export type Match = "ok" | "checkin-only" | "absent-checkin" | "attended-no-checkin" | "absent" | "pending";
export function attendanceMatch(attended: boolean | null, checkedIn: boolean): Match {
  if (attended === null) return checkedIn ? "checkin-only" : "pending";
  if (attended) return checkedIn ? "ok" : "attended-no-checkin";
  return checkedIn ? "absent-checkin" : "absent";
}
export const MATCH_LABEL: Record<Match, { label: string; tone: "ok" | "warn" | "bad" | "muted" }> = {
  ok: { label: "Asistió · con check-in", tone: "ok" },
  "attended-no-checkin": { label: "Asistió · sin check-in", tone: "ok" },
  "checkin-only": { label: "Check-in · falta asistencia del profesor", tone: "muted" },
  "absent-checkin": { label: "Hizo check-in, pero el profesor lo marcó ausente", tone: "warn" },
  absent: { label: "No asistió", tone: "bad" },
  pending: { label: "Sin registro", tone: "muted" },
};

/** Avance AI CERT reportado por el profesional. */
export function cleanSelfProgress(x: { course: string; tramo: number; percent: number; note: string }): { course: "INTRO" | "SPECIALIST"; tramo: number; percent: number; note: string | null } {
  if (x.course !== "INTRO" && x.course !== "SPECIALIST") throw new Error("Elige el curso en el que vas.");
  const tramo = Math.round(Number(x.tramo));
  const percent = Math.round(Number(x.percent));
  if (!(tramo >= 0 && tramo <= 5)) throw new Error("El tramo va de 0 a 5.");
  if (!(percent >= 0 && percent <= 100)) throw new Error("El porcentaje va de 0 a 100.");
  return { course: x.course, tramo, percent, note: x.note.trim().slice(0, 500) || null };
}
