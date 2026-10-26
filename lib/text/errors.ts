/** Mensaje legible de cualquier error (incluidos los de Supabase, que son objetos con `message`, no `Error`). */
export function errorText(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e && "message" in e && typeof (e as { message: unknown }).message === "string") return (e as { message: string }).message;
  return typeof e === "string" ? e : "Ocurrió un error inesperado.";
}

/** Fecha AAAA-MM-DD a partir de lo que escriba una persona (2026-10-30, 2026.10.30, 2026/10/30 o 30-10-2026). */
export function normalizeYmd(input: string): string | null {
  const s = input.trim();
  let m = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
  let y: number, mo: number, d: number;
  if (m) [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else if ((m = s.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/))) [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}
