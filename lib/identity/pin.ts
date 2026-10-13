import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * PIN personal de 4 dígitos. Se guarda solo como hash scrypt con sal propia (no reversible).
 * Un PIN de 4 dígitos es una credencial débil por sí sola: por eso el servidor limita intentos, bloquea
 * temporalmente y exige un segundo factor (código por correo) a las cuentas de administración.
 */
export const PIN_MAX_FAILS = 5;
export const PIN_LOCK_MIN = 15;
export const IP_MAX_FAILS = 20; // por IP en 15 minutos

export const isPin = (s: string) => /^\d{4}$/.test(s);

/** Rechaza PIN triviales: todos iguales o secuencias (1234, 4321, 0123…). */
export function pinProblem(pin: string): string | null {
  if (!isPin(pin)) return "El código debe tener exactamente 4 números.";
  if (/^(\d)\1{3}$/.test(pin)) return "Evita repetir el mismo número (por ejemplo 1111).";
  const d = pin.split("").map(Number);
  const asc = d.every((x, i) => i === 0 || x === (d[i - 1] + 1) % 10);
  const desc = d.every((x, i) => i === 0 || x === (d[i - 1] + 9) % 10);
  if (asc || desc) return "Evita secuencias como 1234 o 4321.";
  return null;
}

const N = 16384, R = 8, P = 1, LEN = 32;
export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const h = scryptSync(pin, salt, LEN, { N, r: R, p: P });
  return `scrypt$${N}$${salt.toString("base64")}$${h.toString("base64")}`;
}
export function verifyPin(pin: string, stored: string | null): boolean {
  if (!stored || !isPin(pin)) return false;
  const [alg, n, salt, hash] = stored.split("$");
  if (alg !== "scrypt") return false;
  const expected = Buffer.from(hash, "base64");
  const got = scryptSync(pin, Buffer.from(salt, "base64"), expected.length, { N: Number(n), r: R, p: P });
  return got.length === expected.length && timingSafeEqual(got, expected);
}

/** Estado legible del PIN para Administración (nunca el PIN). */
export function pinStatus(c: { pin_hash: string | null; must_change: boolean; locked_until: string | null } | null, now = new Date()) {
  if (!c || !c.pin_hash) return { key: "PENDING" as const, label: "Pendiente" };
  if (c.locked_until && new Date(c.locked_until) > now) return { key: "LOCKED" as const, label: "Bloqueado temporalmente" };
  if (c.must_change) return { key: "RENEW" as const, label: "Requiere renovación" };
  return { key: "SET" as const, label: "Configurado" };
}

/** Teléfono chileno: +56 9 + 8 dígitos. Acepta lo que la persona escriba y lo normaliza. */
export function normalizeCLMobile(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("569") && d.length === 11) d = d.slice(3);
  else if (d.startsWith("9") && d.length === 9) d = d.slice(1);
  if (!/^\d{8}$/.test(d)) return null;
  return `+569${d}`;
}
