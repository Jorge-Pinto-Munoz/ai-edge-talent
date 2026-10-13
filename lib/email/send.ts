import "server-only";
import { emailConfig, routeMessage } from "./provider";

/**
 * Envía un correo con Resend por su API REST (POST https://api.resend.com/emails). La llave vive solo en el
 * servidor (RESEND_API_KEY). "Enviado" significa aceptado por Resend, no entregado.
 */
export async function sendEmail(to: string | string[], subject: string, text: string, replyTo?: string, html?: string): Promise<{ id: string | null; error: string | null }> {
  // Direcciones de marcador (.invalid, p.ej. cargas históricas sin correo): nunca se envía.
  const list = (Array.isArray(to) ? to : [to]).filter((t) => !/\.invalid$/i.test(t.trim()));
  if (!list.length) return { id: null, error: "Sin correo registrado." };
  const cfg = emailConfig();
  if (!cfg.ok) return { id: null, error: cfg.error };
  const m = routeMessage(cfg, list, subject, text, html);
  try {
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
