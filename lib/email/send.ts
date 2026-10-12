import "server-only";
import { Resend } from "resend";
import { serverEnv } from "@/lib/supabase/env";

export async function sendEmail(to: string, subject: string, text: string): Promise<{ id: string | null; error: string | null }> {
  const { resendApiKey, resendFrom } = serverEnv();
  if (!resendApiKey || !resendFrom) return { id: null, error: "Envío de correos no configurado (RESEND_API_KEY / RESEND_FROM)." };
  const resend = new Resend(resendApiKey);
  const { data, error } = await resend.emails.send({ from: resendFrom, to, subject, text });
  return { id: data?.id ?? null, error: error ? error.message : null };
}
