/** Proveedor de correo según variables de entorno (solo servidor). Sin dependencias para poder probarlo. */
export type EmailProvider =
  | { kind: "smtp"; host: string; port: number; user: string; pass: string; from: string }
  | { kind: "resend"; apiKey: string; from: string }
  | { kind: "none" };

export function emailProvider(env: Record<string, string | undefined> = process.env): EmailProvider {
  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASS?.replace(/\s+/g, ""); // Google muestra la contraseña de aplicación en grupos con espacios.
  if (user && pass) {
    const port = Number(env.SMTP_PORT) || 465;
    // Gmail exige que el remitente sea la misma cuenta: el nombre visible sí se puede elegir.
    const from = env.EMAIL_FROM?.trim() || `${env.EMAIL_FROM_NAME?.trim() || "AI Edge Talent"} <${user}>`;
    return { kind: "smtp", host: env.SMTP_HOST?.trim() || "smtp.gmail.com", port, user, pass, from };
  }
  if (env.RESEND_API_KEY && env.RESEND_FROM) return { kind: "resend", apiKey: env.RESEND_API_KEY, from: env.RESEND_FROM };
  return { kind: "none" };
}

/** Descripción sin secretos, para diagnóstico. */
export function describeProvider(p: EmailProvider): string {
  if (p.kind === "smtp") return `SMTP ${p.host}:${p.port} · remitente ${p.from}`;
  if (p.kind === "resend") return `Resend · remitente ${p.from}`;
  return "FALTA (SMTP_USER/SMTP_PASS o RESEND_API_KEY/RESEND_FROM)";
}
