import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

/** Reglas del código de acceso del equipo. */
export const CODE_TTL_MIN = 10;
export const CODE_MAX_ATTEMPTS = 5;
export const CODE_MAX_SENDS = 3; // por correo, en la ventana
export const CODE_SEND_WINDOW_MIN = 15;
export const CODE_RESEND_COOLDOWN_S = 45;

export const newCode = () => String(randomInt(0, 10000)).padStart(4, "0");
export const isCode = (s: string) => /^\d{4}$/.test(s);

/** Hash con secreto del servidor: el código nunca se guarda en claro. */
export function hashCode(email: string, code: string, secret: string): string {
  return createHmac("sha256", secret).update(`${email.toLowerCase()}:${code}`).digest("hex");
}
export function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex"), y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Dominios corporativos permitidos (STAFF_EMAIL_DOMAINS="kibernum.com,kibernum.cl"). Vacío = no se filtra por dominio. */
export function domainAllowed(email: string, domains: string | undefined): boolean {
  const list = (domains ?? "").split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
  if (!list.length) return true;
  const d = email.split("@")[1]?.toLowerCase() ?? "";
  return list.some((x) => d === x || d.endsWith(`.${x}`));
}

export const STAFF_ROLES = ["delivery", "admin"] as const;
