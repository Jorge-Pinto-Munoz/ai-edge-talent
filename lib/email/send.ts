import "server-only";
import { Resend } from "resend";
import nodemailer from "nodemailer";
import { emailProvider } from "./provider";

/**
 * Envía un correo con el proveedor configurado:
 * - SMTP (p. ej. una cuenta Gmail dedicada con contraseña de aplicación): no requiere dominio propio.
 * - Resend: requiere un dominio verificado.
 * Si están ambos, se usa SMTP. "Enviado" significa aceptado por el proveedor, no entregado.
 */
export async function sendEmail(to: string | string[], subject: string, text: string, replyTo?: string, html?: string): Promise<{ id: string | null; error: string | null }> {
  // Direcciones de marcador (.invalid, p.ej. cargas históricas sin correo): nunca se envía.
  const list = (Array.isArray(to) ? to : [to]).filter((t) => !/\.invalid$/i.test(t.trim()));
  if (!list.length) return { id: null, error: "Sin correo registrado." };
  const p = emailProvider();
  if (p.kind === "none") return { id: null, error: "Envío de correos no configurado (SMTP_USER / SMTP_PASS o RESEND_API_KEY / RESEND_FROM)." };
  try {
    if (p.kind === "smtp") {
      const transport = nodemailer.createTransport({ host: p.host, port: p.port, secure: p.port === 465, auth: { user: p.user, pass: p.pass } });
      const info = await transport.sendMail({ from: p.from, to: list, subject, text, ...(html ? { html } : {}), ...(replyTo ? { replyTo } : {}) });
      return { id: info.messageId ?? null, error: info.rejected?.length ? `Rechazado: ${info.rejected.join(", ")}` : null };
    }
    const { data, error } = await new Resend(p.apiKey).emails.send({ from: p.from, to: list, subject, text, ...(html ? { html } : {}), ...(replyTo ? { replyTo } : {}) });
    return { id: data?.id ?? null, error: error ? error.message : null };
  } catch (e) {
    return { id: null, error: e instanceof Error ? e.message : String(e) };
  }
}
