/** Cierre semanal del profesor: vocabulario compartido entre formulario, vistas de Delivery y exportes. */
export type TeacherStatus = "AL_DIA" | "EN_RIESGO" | "ATRASADO";
export type TeacherFlag = "NONE" | "CONCERN" | "HIGHLIGHT";

export interface TeacherEntry {
  candidateId: string;
  status: TeacherStatus;
  progress: number | null;
  attended: boolean | null;
  note: string;
  flag: TeacherFlag;
}

export const TEACHER_STATUS: { id: TeacherStatus; label: string; tone: "ok" | "warn" | "bad" }[] = [
  { id: "AL_DIA", label: "Al día", tone: "ok" },
  { id: "EN_RIESGO", label: "En riesgo", tone: "warn" },
  { id: "ATRASADO", label: "Atrasado", tone: "bad" },
];

export const TEACHER_FLAGS: { id: TeacherFlag; label: string; tone?: "bad" | "brand" }[] = [
  { id: "NONE", label: "Sin marca" },
  { id: "CONCERN", label: "Preocupante", tone: "bad" },
  { id: "HIGHLIGHT", label: "Destacado", tone: "brand" },
];

export const statusLabel = (s: string) => TEACHER_STATUS.find((x) => x.id === s)?.label ?? s;
export const statusTone = (s: string) => TEACHER_STATUS.find((x) => x.id === s)?.tone;
export const flagLabel = (f: string) => TEACHER_FLAGS.find((x) => x.id === f)?.label ?? f;

/** Lunes anterior / siguiente a una semana (YYYY-MM-DD). */
export function shiftWeek(week: string, delta: number): string {
  const d = new Date(`${week}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7 * delta);
  return d.toISOString().slice(0, 10);
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
/** "13 – 19 oct" */
export function weekLabel(week: string): string {
  const a = new Date(`${week}T12:00:00Z`);
  const b = new Date(a);
  b.setUTCDate(b.getUTCDate() + 6);
  const same = a.getUTCMonth() === b.getUTCMonth();
  return `${a.getUTCDate()}${same ? "" : ` ${MONTHS[a.getUTCMonth()]}`} – ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]}`;
}
