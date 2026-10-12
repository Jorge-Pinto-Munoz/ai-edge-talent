"use server";

import { supabaseUser } from "@/lib/supabase/server";
import { env } from "@/lib/supabase/env";

export async function sendMagicLink(_: unknown, form: FormData): Promise<{ ok: boolean; message: string }> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const next = String(form.get("next") ?? "/admin/admision");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "Ingresa un correo válido." };
  const supabase = await supabaseUser();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${env.appUrl}/auth/callback?next=${encodeURIComponent(next.startsWith("/") ? next : "/")}` },
  });
  if (error) return { ok: false, message: "No pudimos enviar el enlace. Intenta nuevamente en unos minutos." };
  return { ok: true, message: `Te enviamos un enlace de ingreso a ${email}. Revisa tu bandeja (y spam).` };
}

export async function signOut() {
  const supabase = await supabaseUser();
  await supabase.auth.signOut();
}
