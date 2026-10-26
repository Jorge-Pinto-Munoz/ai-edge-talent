/** Formatos aceptados en las entregas, tamaño máximo y plazo con hora (puro: sirve en cliente y servidor). */

export const SUBMISSION_MAX_MB = 50;

export const FORMAT_GROUPS = {
  pdf: { label: "PDF", ext: ["pdf"] },
  word: { label: "Word", ext: ["doc", "docx"] },
  ppt: { label: "PowerPoint", ext: ["ppt", "pptx"] },
  excel: { label: "Excel", ext: ["xls", "xlsx", "csv"] },
  image: { label: "Imagen", ext: ["png", "jpg", "jpeg", "webp"] },
  zip: { label: "ZIP", ext: ["zip"] },
} as const;
export type FormatKey = keyof typeof FORMAT_GROUPS;
export const FORMAT_KEYS = Object.keys(FORMAT_GROUPS) as FormatKey[];

const extOf = (name: string) => name.toLowerCase().split(".").pop() ?? "";
const groupOf = (name: string) => FORMAT_KEYS.find((k) => (FORMAT_GROUPS[k].ext as readonly string[]).includes(extOf(name)));

/** Formatos de la entrega: los definidos por el admin; si no hay, PDF + el formato de la plantilla (si existe). */
export function effectiveFormats(formats: string[] | null | undefined, templates: { name: string }[] = []): FormatKey[] {
  const set = (formats ?? []).filter((f): f is FormatKey => f in FORMAT_GROUPS);
  if (set.length) return set;
  return [...new Set<FormatKey>(["pdf", ...(templates.map((t) => groupOf(t.name)).filter(Boolean) as FormatKey[])])];
}

export const acceptAttr = (formats: FormatKey[]) => formats.flatMap((f) => FORMAT_GROUPS[f].ext.map((e) => `.${e}`)).join(",");
export const formatsLabel = (formats: FormatKey[]) => formats.map((f) => `${FORMAT_GROUPS[f].label} (${FORMAT_GROUPS[f].ext.map((e) => `.${e}`).join(", ")})`).join(" · ");
export const fileAllowed = (name: string, formats: FormatKey[]) => formats.some((f) => (FORMAT_GROUPS[f].ext as readonly string[]).includes(extOf(name)));

/** Plazo en palabras, en hora de Chile: «jueves 30 de octubre de 2026, 23:59 h». */
export function fmtDue(iso: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  return `${day}, ${time} h`;
}

/** Plazo efectivo: fecha y hora si existe; si solo hay fecha, ese día a las 23:59 (hora de Chile). */
export function dueIso(dueAt: string | null | undefined, dueDate: string | null | undefined, toIso: (local: string) => string): string | null {
  if (dueAt) return dueAt;
  return dueDate ? toIso(`${dueDate}T23:59`) : null;
}

/** «Quedan 3 días», «Vence hoy», «Venció hace 2 días». */
export function dueRelative(iso: string, now = new Date()): { text: string; tone: "ok" | "warn" | "bad" } {
  const ms = new Date(iso).getTime() - now.getTime();
  const h = ms / 3_600_000;
  if (ms < 0) { const d = Math.ceil(-h / 24); return { text: d <= 1 ? "Venció" : `Venció hace ${d} días`, tone: "bad" }; }
  if (h < 24) return { text: h < 1 ? "Vence en menos de 1 hora" : `Vence en ${Math.floor(h)} h`, tone: "warn" };
  const d = Math.floor(h / 24);
  return { text: d === 1 ? "Queda 1 día" : `Quedan ${d} días`, tone: d <= 2 ? "warn" : "ok" };
}
