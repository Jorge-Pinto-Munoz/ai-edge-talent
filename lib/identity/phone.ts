/** Teléfonos: se guardan en formato internacional E.164 (+56912345678). Sin dependencias: cliente y servidor. */
/** Prefijo, país y código corto (lo que se ve en el selector, para que no se trunque en móvil). */
export const PHONE_PREFIXES = [
  ["+56", "Chile", "CL"], ["+54", "Argentina", "AR"], ["+51", "Perú", "PE"], ["+57", "Colombia", "CO"], ["+52", "México", "MX"],
  ["+593", "Ecuador", "EC"], ["+598", "Uruguay", "UY"], ["+595", "Paraguay", "PY"], ["+591", "Bolivia", "BO"], ["+58", "Venezuela", "VE"],
  ["+1", "EE. UU. / Canadá", "US"], ["+34", "España", "ES"],
] as const;
export const DEFAULT_PREFIX = "+56";

/**
 * Normaliza un teléfono a E.164. Acepta "+56 9 1234 5678", "912345678", "1234 5678" (Chile: se asume móvil),
 * o cualquier número internacional con "+" y código de país. Devuelve null si no es válido.
 */
export function normalizePhone(raw: string, prefix: string = DEFAULT_PREFIX): string | null {
  const s = raw.trim();
  if (!s) return null;
  let cc = prefix.replace(/\D/g, "");
  let d = s.replace(/\D/g, "");
  if (s.startsWith("+")) {
    const known = PHONE_PREFIXES.map(([p]) => p.slice(1)).sort((a, b) => b.length - a.length).find((p) => d.startsWith(p));
    if (!known) return d.length >= 8 && d.length <= 15 ? `+${d}` : null;
    cc = known;
    d = d.slice(known.length);
  } else if (cc === "56" && d.startsWith("56") && d.length === 11) d = d.slice(2);
  if (cc === "56") {
    if (d.length === 8) d = `9${d}`; // móvil sin el 9 inicial
    return /^[2-9]\d{8}$/.test(d) ? `+56${d}` : null;
  }
  const full = `${cc}${d}`;
  return d.length >= 6 && full.length <= 15 ? `+${full}` : null;
}

/** Separa un E.164 en prefijo conocido y número, para mostrarlo en el formulario. */
export function splitPhone(e164: string | null | undefined): { prefix: string; number: string } {
  if (!e164) return { prefix: DEFAULT_PREFIX, number: "" };
  const d = e164.replace(/\D/g, "");
  const p = PHONE_PREFIXES.map(([x]) => x).sort((a, b) => b.length - a.length).find((x) => d.startsWith(x.slice(1)));
  return p ? { prefix: p, number: d.slice(p.length - 1) } : { prefix: DEFAULT_PREFIX, number: e164 };
}
