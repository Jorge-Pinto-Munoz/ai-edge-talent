/**
 * Tolera errores comunes al copiar la configuración en el hosting:
 * espacios, "/" final o la URL de la API REST (".../rest/v1/") en vez de la del proyecto.
 */
export function normalizeSupabaseUrl(raw: string | undefined): string {
  return (raw ?? "").trim().replace(/\/+$/, "").replace(/\/(rest|auth|storage)\/v1$/, "").replace(/\/+$/, "");
}

export function normalizeKey(raw: string | undefined): string {
  return (raw ?? "").trim();
}

export function normalizeAppUrl(raw: string | undefined, fallback: string): string {
  return ((raw ?? "").trim() || fallback).replace(/\/+$/, "");
}
