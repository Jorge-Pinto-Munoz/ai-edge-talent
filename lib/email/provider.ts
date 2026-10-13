/** Configuración de correo (Resend por API REST). Solo servidor; sin dependencias para poder probarla. */
export const RESEND_TEST_FROM = "AI Edge Talent <onboarding@resend.dev>";

export type EmailConfig =
  | { ok: true; apiKey: string; from: string; testMode: boolean; testTo: string | null }
  | { ok: false; error: string };

export function emailConfig(env: Record<string, string | undefined> = process.env): EmailConfig {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "Envío de correos no configurado (falta RESEND_API_KEY)." };
  const from = env.RESEND_FROM?.trim() || RESEND_TEST_FROM;
  // Con el remitente de prueba de Resend, solo se entrega al correo dueño de la cuenta de Resend.
  const testMode = /@resend\.dev>?$/i.test(from);
  const testTo = env.RESEND_TEST_TO?.trim().toLowerCase() || null;
  if (testMode && !testTo) return { ok: false, error: "Modo de prueba de Resend: falta RESEND_TEST_TO (el correo de tu cuenta de Resend)." };
  return { ok: true, apiKey, from, testMode, testTo };
}

/**
 * En modo de prueba todo correo se redirige al dueño de la cuenta, indicando a quién iba dirigido.
 * Así el flujo completo se puede probar sin que Resend rechace a otros destinatarios.
 */
export function routeMessage(cfg: Extract<EmailConfig, { ok: true }>, to: string[], subject: string, text: string, html?: string) {
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

/** Descripción sin secretos, para diagnóstico. */
export function describeEmail(cfg: EmailConfig): string {
  if (!cfg.ok) return `FALTA · ${cfg.error}`;
  return cfg.testMode ? `Resend (modo prueba) · remitente ${cfg.from} · todo se entrega a ${maskEmail(cfg.testTo!)}` : `Resend · remitente ${cfg.from}`;
}

/** El diagnóstico es público: el correo se muestra parcialmente. */
export const maskEmail = (e: string) => e.replace(/^(.{2})[^@]*(@.*)$/, "$1•••$2");
