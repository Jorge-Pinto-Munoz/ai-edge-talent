"use server";

import { supabaseUser } from "@/lib/supabase/server";
import { env } from "@/lib/supabase/env";

export async function sendMagicLink(_: unknown, form: FormData): Promise<{ ok: boolean; message: string }> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const next = String(form.get("next") ?? "/inicio");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "Ingresa un correo válido." };
  const supabase = await supabaseUser();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${env.appUrl}/auth/callback?next=${encodeURIComponent(next.startsWith("/") ? next : "/")}` },
  });
  if (error) {
    // Queda en los logs del hosting (Vercel → Logs) con el motivo exacto.
    console.error("[login] signInWithOtp", error.status, error.code, error.message);
    return { ok: false, message: loginErrorMessage(error.code, error.status) };
  }
  return { ok: true, message: `Te enviamos un enlace de ingreso a ${email}. Revisa tu bandeja (y spam).` };
}

export async function signOut() {
  const supabase = await supabaseUser();
  await supabase.auth.signOut();
}

/** Mensaje para la persona según el motivo que entrega Supabase Auth (sin datos sensibles). */
function loginErrorMessage(code: string | undefined, status: number | undefined): string {
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || status === 429)
    return "Se alcanzó el límite de correos por ahora. Espera unos minutos e inténtalo de nuevo.";
  if (code === "email_address_not_authorized")
    return "El servicio de correo aún no puede enviar a esta dirección. El equipo AET debe configurar el envío de correos (SMTP).";
  if (code === "email_address_invalid") return "Ese correo no es válido para ingresar.";
  if (code === "email_provider_disabled" || code === "otp_disabled" || code === "signup_disabled")
    return "El ingreso por correo está desactivado en la configuración. Avísale al equipo AET.";
  if (status === 401 || status === 403) return "La plataforma no está bien conectada a la base de datos (clave). Avísale al equipo AET.";
  return `No pudimos enviar el enlace. Intenta nuevamente en unos minutos. (código: ${code ?? "sin código"} · ${status ?? "sin respuesta"})`;
}
