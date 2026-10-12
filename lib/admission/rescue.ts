/**
 * Video de rescate (especificación v1, sección 8): para quien queda bajo el corte (nivel D).
 * Complementa el Assessment —no lo reemplaza ni obliga a seleccionar— y el Product Lead reevalúa.
 * Las preguntas buscan lo que el formulario escrito puede subrepresentar: compromiso, interés concreto y afinidad con la IA.
 */
export const RESCUE_MAX_MINUTES = 3;

export const RESCUE_QUESTIONS: { key: "commitment" | "interest" | "ai_affinity" | "autonomy"; question: string; why: string }[] = [
  {
    key: "commitment",
    question: "¿Por qué quieres entrar a AI Edge Talent ahora y cómo vas a organizar tu tiempo para estudiar, certificarte y construir durante las próximas semanas?",
    why: "Compromiso: motivación propia y un plan realista para sostener el proceso.",
  },
  {
    key: "ai_affinity",
    question: "Cuéntanos (o muéstranos en pantalla) una tarea real de esta semana en la que usaste IA: qué le pediste, qué te entregó y qué corregiste o decidiste tú.",
    why: "Afinidad con la IA: uso real con criterio propio, no solo declarado.",
  },
  {
    key: "interest",
    question: "¿Qué problema concreto de tu trabajo con tu cliente te gustaría resolver con IA en el AI Lab, y cómo sabrías que funcionó?",
    why: "Interés concreto: una oportunidad real de aplicación y una noción de valor.",
  },
  {
    key: "autonomy",
    question: "¿Qué aprendiste por tu cuenta sobre IA en el último mes y dónde lo aprendiste?",
    why: "Aprendizaje autónomo: iniciativa para mantenerse al día.",
  },
];

/** Criterios con que el Product Lead reevalúa el video (1–5 cada uno). */
export const RESCUE_CRITERIA = [
  { key: "commitment", label: "Compromiso" },
  { key: "interest", label: "Interés concreto" },
  { key: "ai_affinity", label: "Afinidad con la IA" },
] as const;

export const RESCUE_SCALE = ["1 · No se observa", "2 · Débil", "3 · Suficiente", "4 · Claro", "5 · Sobresaliente"];

/** Acepta solo enlaces http(s) a plataformas de video o almacenamiento conocidas. */
export function isAcceptableVideoUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:") return false;
    return /(^|\.)(youtube\.com|youtu\.be|vimeo\.com|loom\.com|drive\.google\.com|onedrive\.live\.com|1drv\.ms|sharepoint\.com|dropbox\.com|stream\.microsoft\.com)$/.test(u.hostname);
  } catch {
    return false;
  }
}
