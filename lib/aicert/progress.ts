/**
 * Avance AI CERT por participante: ruta (curso introductorio + especialista) y avance por tramo (1 a 5) y %.
 * Lo actualiza solo el líder del programa (admin), desde la plataforma AI CERTs. Las alertas no expulsan: recomiendan una acción.
 */
export type AiCertCourse = "INTRO" | "SPECIALIST";
export interface AiCertProgress {
  course: AiCertCourse;
  tramo: number;
  percent: number;
  intro_course: string | null;
  specialist_course: string | null;
  exam_date: string | null;
  note: string | null;
  updated_at: string;
}

export const COURSE_LABEL: Record<AiCertCourse, string> = { INTRO: "Curso introductorio", SPECIALIST: "Curso especialista" };
/** Ritmo de referencia: la ruta completa (~40 h) en unas 4 semanas. */
export const EXPECTED_DAYS = 28;

/** Avance total de la ruta 0–100: el introductorio pesa la primera mitad y el especialista la segunda. */
export function overallProgress(p: Pick<AiCertProgress, "course" | "percent"> | null): number {
  if (!p) return 0;
  const half = Math.max(0, Math.min(100, p.percent)) / 2;
  return Math.round(p.course === "SPECIALIST" ? 50 + half : half);
}

export function progressLabel(p: Pick<AiCertProgress, "course" | "tramo" | "percent"> | null): string {
  if (!p || (p.tramo === 0 && p.percent === 0)) return "Sin avance registrado";
  return `${p.course === "SPECIALIST" ? "Especialista" : "Introductorio"} · Tramo ${p.tramo} · ${p.percent}%`;
}

export type RiskLevel = "Alta" | "Media" | "Preventiva";
export interface RiskAlert { level: RiskLevel; reason: string; action: string }

/**
 * Alerta por participante en Role Enablement, como la tabla del informe W2: nivel, motivo y acción recomendada.
 * Combina el avance en plataforma, la asistencia a clases y la última lectura del pulso de habilitación.
 */
export function aicertAlert(ctx: {
  progress: AiCertProgress | null;
  daysInStage: number;
  attendance?: number | null;
  pulse?: { icaa: number | null; gpc: number | null; tri: boolean; tai: boolean; barrier: string | null; severity: number | null } | null;
  now?: Date;
}): RiskAlert | null {
  const overall = overallProgress(ctx.progress);
  const expected = Math.min(100, Math.round((ctx.daysInStage / EXPECTED_DAYS) * 100));
  const stale = ctx.progress ? ((ctx.now ?? new Date()).getTime() - new Date(ctx.progress.updated_at).getTime()) / 86_400_000 : Infinity;
  const p = ctx.pulse;

  if (p?.tri && p.barrier && (p.severity ?? 0) >= 4) {
    return { level: "Alta", reason: `Barrera de severidad ${p.severity}: ${p.barrier.toLowerCase()}.`, action: "Aclarar la evaluación y el próximo paso, con apoyo técnico focalizado." };
  }
  if (ctx.daysInStage >= 7 && overall === 0) {
    return { level: "Alta", reason: "Sin avance registrado en la plataforma AI CERTs.", action: "Contactar esta semana, acordar un microplan semanal y revisar el acceso a la plataforma." };
  }
  if (expected - overall >= 30) {
    return { level: "Alta", reason: `Avance ${overall}% frente a ${expected}% esperado a la fecha.`, action: "Microplan semanal, práctica guiada y seguimiento antes de la siguiente clase." };
  }
  if (p && ((p.gpc !== null && p.gpc < 0) || (p.icaa !== null && p.icaa < 50))) {
    return { level: "Media", reason: `Capacidad percibida baja${p.icaa !== null ? ` (ICAA ${p.icaa})` : ""}${p.gpc !== null && p.gpc < 0 ? " y en retroceso" : ""}.`, action: "Simplificar el lenguaje, trabajar un caso completo con el profesor y preparar la certificación." };
  }
  if (ctx.attendance !== null && ctx.attendance !== undefined && ctx.attendance < 0.75) {
    return { level: "Media", reason: `Asistencia a clases de ${Math.round(ctx.attendance * 100)}%.`, action: "Conversar la asistencia y acordar cómo recupera lo visto." };
  }
  if (expected - overall >= 15) {
    return { level: "Media", reason: `Avance ${overall}% frente a ${expected}% esperado.`, action: "Acordar una meta de tramo para la semana y revisarla en clase." };
  }
  if (p?.barrier === "Falta de tiempo") {
    return { level: "Preventiva", reason: "Falta de tiempo, aunque avanza.", action: "Acordar fecha de examen y bloquear tiempo protegido con Delivery." };
  }
  if (ctx.progress?.course === "SPECIALIST" && ctx.progress.percent >= 80 && !ctx.progress.exam_date) {
    return { level: "Preventiva", reason: "Cerca de terminar y sin fecha de examen.", action: "Fijar la fecha del examen AI CERT." };
  }
  if (ctx.progress && stale > 14) {
    return { level: "Preventiva", reason: "El avance no se actualiza hace más de dos semanas.", action: "Actualizar el avance desde la plataforma AI CERTs." };
  }
  return null;
}
