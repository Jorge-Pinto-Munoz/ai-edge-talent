/** Orden de las Waves en toda la plataforma: en curso primero; dentro de cada grupo, de la más nueva a la más antigua (3, 2, 1). */
const num = (id: string) => Number(id.match(/(\d+)/)?.[1] ?? 0);
export function sortWaves<T extends { id: string; status: string }>(waves: T[]): T[] {
  return [...waves].sort((a, b) => Number(a.status === "CLOSED") - Number(b.status === "CLOSED") || num(b.id) - num(a.id));
}
