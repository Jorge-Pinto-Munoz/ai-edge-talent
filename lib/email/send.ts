import "server-only";
import nodemailer from "nodemailer";
import { emailConfig, routeMessage } from "./provider";

/**
 * Envía un correo con el proveedor configurado (SMTP de iCloud, o Resend por API REST). Las credenciales
 * viven solo en el servidor. "Enviado" significa aceptado por el proveedor, no entregado.
 */
export async function sendEmail(to: string | string[], subject: string, text: string, replyTo?: string, html?: string): Promise<{ id: string | null; error: string | null }> {
  // Direcciones de marcador (.invalid, p.ej. cargas históricas sin correo): nunca se envía.
  const list = (Array.isArray(to) ? to : [to]).filter((t) => !/\.invalid$/i.test(t.trim()));
  if (!list.length) return { id: null, error: "Sin correo registrado." };
  const cfg = emailConfig();
  if (!cfg.ok) return { id: null, error: cfg.error };
  const m = routeMessage(cfg, list, subject, text, html);
  try {
    if (cfg.kind === "smtp") {
      const transport = nodemailer.createTransport({ host: cfg.host, port: cfg.port, secure: cfg.port === 465, requireTLS: cfg.port !== 465, auth: { user: cfg.user, pass: cfg.pass } });
      const info = await transport.sendMail({ from: cfg.from, to: m.to, subject: m.subject, text: m.text, ...(m.html ? { html: m.html } : {}), ...(replyTo ? { replyTo } : {}) });
      return { id: info.messageId ?? null, error: info.rejected?.length ? `Rechazado: ${info.rejected.join(", ")}` : null };
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: cfg.from, to: m.to, subject: m.subject, text: m.text, ...(m.html ? { html: m.html } : {}), ...(replyTo ? { reply_to: replyTo } : {}) }),
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!res.ok) return { id: null, error: `Resend ${res.status}: ${body.message ?? body.name ?? "error"}` };
    return { id: body.id ?? null, error: null };
  } catch (e) {
    return { id: null, error: e instanceof Error ? e.message : String(e) };
  }
}
