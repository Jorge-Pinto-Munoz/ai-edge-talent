/**
 * Homologación de nombres de cliente (y de rol) escritos de distintas formas por los postulantes.
 * "banco bci", "Banco BCI S.A." y "BANCO  BCI" quedan con la misma clave y se muestran igual: se usa la forma
 * más frecuente entre los candidatos (o la mejor capitalizada si hay empate). Puro, para poder probarlo.
 */
const LEGAL = /\b(s\.?\s?a\.?|s\.?p\.?a\.?|spa|ltda\.?|limitada|ltd\.?|inc\.?|corp\.?|e\.?i\.?r\.?l\.?|y cia\.?|& cia\.?|chile)\b\.?/gi;

export function orgKey(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(LEGAL, " ")
    .replace(/[^a-z0-9& ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Capitalización legible: respeta siglas (BCI, BBVA) y pone mayúscula inicial al resto. */
export function prettyName(raw: string): string {
  const clean = raw.replace(/\s+/g, " ").trim();
  if (clean !== clean.toLowerCase() && clean !== clean.toUpperCase()) return clean; // ya viene con mayúsculas intencionales
  return clean
    .toLowerCase()
    .split(" ")
    .map((w, i) => (w.length <= 3 && i > 0 && /^(de|del|la|las|el|los|y|e)$/.test(w) ? w : w.length <= 4 && /^[a-z]+$/.test(w) && clean === clean.toUpperCase() ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/** Construye el nombre visible para cada valor escrito, agrupando por clave. */
export function homologate(values: (string | null | undefined)[]): (raw: string | null | undefined) => string | null {
  const groups = new Map<string, Map<string, number>>();
  for (const v of values) {
    const k = orgKey(v);
    if (!k || !v) continue;
    const forms = groups.get(k) ?? new Map<string, number>();
    const f = v.replace(/\s+/g, " ").trim();
    forms.set(f, (forms.get(f) ?? 0) + 1);
    groups.set(k, forms);
  }
  const best = new Map<string, string>();
  for (const [k, forms] of groups) {
    // Más frecuente; en empate, la que trae mayúsculas mixtas (escrita con cuidado) y sin sufijo legal.
    const pick = [...forms.entries()].sort((a, b) => b[1] - a[1] || score(b[0]) - score(a[0]))[0][0];
    best.set(k, prettyName(pick.replace(LEGAL, " ").replace(/\s+/g, " ").replace(/[\s,.-]+$/, "").trim() || pick));
  }
  return (raw) => (raw && orgKey(raw) ? best.get(orgKey(raw)) ?? prettyName(raw) : null);
}

const LEGAL_ONE = new RegExp(LEGAL.source, "i");
const score = (s: string) => (s !== s.toLowerCase() && s !== s.toUpperCase() ? 2 : 0) + (LEGAL_ONE.test(s) ? 0 : 1);
