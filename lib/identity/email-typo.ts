/** Dominios frecuentes de la plataforma: si el correo trae uno casi igual, se sugiere la corrección. */
const KNOWN = ["kibernum.com", "kibernum.cl", "gmail.com", "hotmail.com", "outlook.com", "icloud.com", "me.com", "yahoo.com"];

function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}

/** Devuelve el correo corregido si el dominio parece un error de tipeo (p. ej. kibenrum.com → kibernum.com). */
export function suggestEmail(email: string): string | null {
  const m = email.trim().toLowerCase().match(/^([^@\s]+)@([^@\s]+\.[a-z]{2,})$/);
  if (!m) return null;
  const [, user, domain] = m;
  if (KNOWN.includes(domain)) return null;
  const best = KNOWN.map((k) => ({ k, d: distance(domain, k) })).sort((x, y) => x.d - y.d)[0];
  return best && best.d > 0 && best.d <= 2 ? `${user}@${best.k}` : null;
}
