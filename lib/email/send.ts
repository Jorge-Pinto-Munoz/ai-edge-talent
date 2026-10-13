import "server-only";
import { Resend } from "resend";
import { serverEnv } from "@/lib/supabase/env";

export async function sendEmail(to: string | string[], subject: string, text: string, replyTo?: string, html?: string): Promise<{ id: string | null; error: string | null }> {
  // Direcciones de marcador (.invalid, p.ej. cargas históricas sin correo): nunca se envía.
  const list = (Array.isArray(to) ? to : [to]).filter((t) => !/\.invalid$/i.test(t.trim()));
  if (!list.length) return { id: null, error: "Sin correo registrado." };
  to = Array.isArray(to) ? list : list[0];
  const { resendApiKey, resendFrom } = serverEnv();
  if (!resendApiKey || !resendFrom) return { id: null, error: "Envío de correos no configurado (RESEND_API_KEY / RESEND_FROM)." };
  const resend = new Resend(resendApiKey);
  const { data, error } = await resend.emails.send({ from: resendFrom, to, subject, text, ...(html ? { html } : {}), ...(replyTo ? { replyTo } : {}) });
  return { id: data?.id ?? null, error: error ? error.message : null };
}
