/**
 * Configuración de correo (solo servidor; sin dependencias para poder probarla).
 * - SMTP (por defecto iCloud: smtp.mail.me.com:587) con una contraseña específica de app: entrega a cualquiera,
 *   el remitente es esa cuenta. Tiene prioridad si están SMTP_USER y SMTP_PASS.
 * - Resend por API REST: con dominio verificado entrega a cualquiera; con el remitente de prueba
 *   (onboarding@resend.dev) solo al dueño de la cuenta, así que todo se redirige a RESEND_TEST_TO.
 */
export const RESEND_TEST_FROM = "AI Edge Talent <onboarding@resend.dev>";

export type EmailConfig =
  | { ok: true; kind: "smtp"; host: string; port: number; user: string; pass: string; from: string; testMode: false; testTo: null }
  | { ok: true; kind: "resend"; apiKey: string; from: string; testMode: boolean; testTo: string | null }
  | { ok: false; error: string };

export function emailConfig(env: Record<string, string | undefined> = process.env): EmailConfig {
  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASS?.replace(/\s+/g, "");
  if (user && pass) {
    // iCloud y Gmail exigen que el remitente sea la misma cuenta; el nombre visible sí se elige.
    const from = `${env.EMAIL_FROM_NAME?.trim() || "AI Edge Talent"} <${user}>`;
    return { ok: true, kind: "smtp", host: env.SMTP_HOST?.trim() || "smtp.mail.me.com", port: Number(env.SMTP_PORT) || 587, user, pass, from, testMode: false, testTo: null };
  }
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "Envío de correos no configurado (SMTP_USER/SMTP_PASS o RESEND_API_KEY)." };
  const from = env.RESEND_FROM?.trim() || RESEND_TEST_FROM;
  const testMode = /@resend\.dev>?$/i.test(from);
  const testTo = env.RESEND_TEST_TO?.trim().toLowerCase() || null;
  if (testMode && !testTo) return { ok: false, error: "Modo de prueba de Resend: falta RESEND_TEST_TO (el correo de tu cuenta de Resend)." };
  return { ok: true, kind: "resend", apiKey, from, testMode, testTo };
}

type Ready = Extract<EmailConfig, { ok: true }>;

/** En modo de prueba de Resend todo se redirige al dueño de la cuenta, indicando a quién iba dirigido. */
export function routeMessage(cfg: Ready, to: string[], subject: string, text: string, html?: string) {
  if (!cfg.testMode) return { to, subject, text, html };
  const original = to.join(", ");
  const note = `[Prueba] Este correo iba dirigido a: ${original}`;
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  return {
    to: [cfg.testTo!],
    subject: `[Prueba → ${original}] ${subject}`,
    text: `${note}\n\n${text}`,
    html: html ? html.replace(/<body([^>]*)>/i, `<body$1><div style="padding:10px 14px;background:#fff4d6;font-family:Arial,sans-serif;font-size:13px;color:#5a4300">${esc(note)}</div>`) : undefined,
  };
}

/** El diagnóstico es público: el correo se muestra parcialmente. */
export const maskEmail = (e: string) => e.replace(/^(.{2})[^@]*(@.*)$/, "$1•••$2");

/** Descripción sin secretos, para diagnóstico. */
export function describeEmail(cfg: EmailConfig): string {
  if (!cfg.ok) return `FALTA · ${cfg.error}`;
  if (cfg.kind === "smtp") return `SMTP ${cfg.host}:${cfg.port} · remitente ${cfg.from.replace(cfg.user, maskEmail(cfg.user))} · entrega a todos`;
  return cfg.testMode ? `Resend (modo prueba) · remitente ${cfg.from} · todo se entrega a ${maskEmail(cfg.testTo!)}` : `Resend · remitente ${cfg.from} · entrega a todos`;
}
