/**
 * Registro de clase del profesor: normalmente una clase por semana.
 * El profesor registra la clase (objetivo, tema, puntos a destacar) y quién asistió.
 * No califica ni comenta a cada persona: el seguimiento para Delivery se calcula desde la asistencia.
 */
export interface ClassInput {
  id?: string;
  waveId: string;
  heldOn: string;
  objective: string;
  topic: string;
  highlights: string;
  nextSteps: string;
  comments: string;
  attendance: { candidateId: string; attended: boolean }[];
}

export const CLASS_FIELDS = [
  { key: "objective", label: "Objetivo de la clase", placeholder: "Qué se buscaba lograr", rows: 2 },
  { key: "topic", label: "Tema abordado", placeholder: "Contenidos, ejercicios o herramientas que se vieron", rows: 2 },
  { key: "highlights", label: "Puntos a destacar", placeholder: "Lo que funcionó, dudas frecuentes, logros del grupo", rows: 3 },
  { key: "nextSteps", label: "Tarea o próximos pasos", placeholder: "Qué deben preparar para la próxima clase (opcional)", rows: 2 },
  { key: "comments", label: "Otros comentarios", placeholder: "Opcional", rows: 2 },
] as const;

/** Bajo este porcentaje de asistencia (con al menos 3 clases) se avisa a Delivery. */
export const MIN_ATTENDANCE = 0.75;

export type AttendanceRow = { class_id: string; candidate_id: string; attended: boolean };
export type AlertLevel = "high" | "medium" | "low";
export interface PersonAttendance {
  candidateId: string;
  attended: number;
  recorded: number;
  rate: number | null;
  streak: number; // inasistencias seguidas, contando desde la clase más reciente
  alert: { level: AlertLevel; reason: string } | null;
}

/** Resumen por persona. `classes` puede venir en cualquier orden; se ordena por fecha. */
export function attendanceByPerson(classes: { id: string; held_on: string }[], rows: AttendanceRow[], candidateIds: string[]): PersonAttendance[] {
  const ordered = [...classes].sort((a, b) => b.held_on.localeCompare(a.held_on)); // más reciente primero
  return candidateIds.map((id) => {
    const marks = ordered.map((c) => rows.find((r) => r.class_id === c.id && r.candidate_id === id)).filter((r): r is AttendanceRow => Boolean(r));
    const attended = marks.filter((m) => m.attended).length;
    let streak = 0;
    for (const m of marks) {
      if (m.attended) break;
      streak++;
    }
    const rate = marks.length ? attended / marks.length : null;
    let alert: PersonAttendance["alert"] = null;
    if (streak >= 2) alert = { level: "high", reason: `${streak} clases seguidas sin asistir` };
    else if (rate !== null && marks.length >= 3 && rate < MIN_ATTENDANCE) alert = { level: "medium", reason: `Asistencia de ${Math.round(rate * 100)}%` };
    else if (streak === 1) alert = { level: "low", reason: "No asistió a la última clase" };
    return { candidateId: id, attended, recorded: marks.length, rate, streak, alert };
  });
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
const DAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
/** "mié 14 oct" */
export function classDateLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** Fecha de hoy en Chile (YYYY-MM-DD). */
export function todayChile(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
