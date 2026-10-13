"use server";

import { headers } from "next/headers";
import { supabaseService, supabaseUser } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { serverEnv } from "@/lib/supabase/env";
import {
  CODE_MAX_ATTEMPTS, CODE_MAX_SENDS, CODE_RESEND_COOLDOWN_S, CODE_SEND_WINDOW_MIN, CODE_TTL_MIN,
  STAFF_ROLES, domainAllowed, hashCode, isCode, newCode, sameHash,
} from "./codes";
import { openAccessSession } from "./audit";

export type CodeResult = { ok: boolean; message: string; devCode?: string };
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const GENERIC = "Si el correo está autorizado para el área de equipo, te enviamos un código de 4 dígitos. Revisa tu bandeja (y spam).";

function secret(): string {
  const s = process.env.STAFF_CODE_SECRET || serverEnv().serviceRoleKey;
  if (!s) throw new Error("Falta configuración del servidor.");
  return s;
}

/** ¿El correo tiene un rol de equipo autorizado? Mira el perfil y, si aún no ingresa nunca, los accesos otorgados. */
async function staffRole(email: string): Promise<string | null> {
  const svc = supabaseService();
  const { data: p } = await svc.from("profiles").select("role").eq("email", email).maybeSingle();
  if (p) return (STAFF_ROLES as readonly string[]).includes(p.role) ? p.role : null;
  const { data: g } = await svc.from("role_grants").select("role").eq("email", email).maybeSingle();
  return g && (STAFF_ROLES as readonly string[]).includes(g.role) ? g.role : null;
}

/** Paso 1: pide un código. La respuesta no revela si el correo existe (salvo el dominio, que es público). */
export async function requestStaffCode(rawEmail: string): Promise<CodeResult> {
  try {
    const email = rawEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return { ok: false, message: "Ingresa tu correo corporativo." };
    if (!domainAllowed(email, process.env.STAFF_EMAIL_DOMAINS)) return { ok: false, message: "Usa tu correo corporativo de Kibernum." };

    const svc = supabaseService();
    const since = new Date(Date.now() - CODE_SEND_WINDOW_MIN * 60_000).toISOString();
    const { data: recent } = await svc.from("staff_login_codes").select("created_at").eq("email", email).gte("created_at", since).order("created_at", { ascending: false });
    if ((recent ?? []).length >= CODE_MAX_SENDS) return { ok: false, message: `Pediste varios códigos. Espera ${CODE_SEND_WINDOW_MIN} minutos e inténtalo de nuevo.` };
    if (recent?.[0] && Date.now() - new Date(recent[0].created_at).getTime() < CODE_RESEND_COOLDOWN_S * 1000) {
      return { ok: false, message: `Espera unos segundos antes de pedir otro código.` };
    }

    const role = await staffRole(email);
    if (!role) return { ok: true, message: GENERIC }; // no autorizado: misma respuesta, sin enviar nada

    // Un solo código vigente por persona.
    await svc.from("staff_login_codes").update({ consumed_at: new Date().toISOString() }).eq("email", email).is("consumed_at", null);
    const code = newCode();
    const { error } = await svc.from("staff_login_codes").insert({ email, code_hash: hashCode(email, code, secret()), expires_at: new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString() });
    if (error) throw error;

    const sent = await sendEmail(email, `Tu código de acceso AI Edge Talent: ${code}`, `Tu código para ingresar al área de equipo de AI Edge Talent es:\n\n${code}\n\nVence en ${CODE_TTL_MIN} minutos. Si no lo pediste, ignora este correo.`);
    if (sent.error) {
      // En desarrollo el código se muestra para poder probar; en producción nunca.
      if (process.env.NODE_ENV !== "production") return { ok: true, message: GENERIC, devCode: code };
      console.error("[equipo] envío de código", sent.error);
      return { ok: false, message: "No pudimos enviar el código: el envío de correos aún no está configurado. Ingresa con el enlace por correo mientras tanto." };
    }
    return { ok: true, message: GENERIC };
  } catch (e) {
    console.error("[equipo] requestStaffCode", e);
    return { ok: false, message: "No pudimos generar el código. Intenta de nuevo en unos minutos." };
  }
}

/** Paso 2: valida el código y abre la sesión (cookies de Supabase) desde el servidor. */
export async function verifyStaffCode(rawEmail: string, rawCode: string): Promise<CodeResult> {
  try {
    const email = rawEmail.trim().toLowerCase();
    const code = rawCode.trim();
    if (!isCode(code)) return { ok: false, message: "El código tiene 4 números." };
    const svc = supabaseService();
    const { data: row } = await svc.from("staff_login_codes").select("id, code_hash, expires_at, attempts").eq("email", email).is("consumed_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!row || new Date(row.expires_at).getTime() < Date.now()) return { ok: false, message: "El código venció o no existe. Pide uno nuevo." };
    if (row.attempts >= CODE_MAX_ATTEMPTS) return { ok: false, message: "Demasiados intentos. Pide un código nuevo." };
    if (!sameHash(row.code_hash, hashCode(email, code, secret()))) {
      const left = CODE_MAX_ATTEMPTS - row.attempts - 1;
      await svc.from("staff_login_codes").update({ attempts: row.attempts + 1, ...(left <= 0 ? { consumed_at: new Date().toISOString() } : {}) }).eq("id", row.id);
      return { ok: false, message: left > 0 ? `Código incorrecto. Te quedan ${left} intento${left === 1 ? "" : "s"}.` : "Demasiados intentos. Pide un código nuevo." };
    }
    await svc.from("staff_login_codes").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);

    // El rol se vuelve a comprobar al canjear: el dominio nunca basta por sí solo.
    const role = await staffRole(email);
    if (!role) return { ok: false, message: "Tu cuenta no tiene acceso al área de equipo." };

    const { data: existing } = await svc.from("profiles").select("id").eq("email", email).maybeSingle();
    if (!existing) {
      const { error: ce } = await svc.auth.admin.createUser({ email, email_confirm: true });
      if (ce && !/already/i.test(ce.message)) throw ce;
    }
    const { data: link, error: le } = await svc.auth.admin.generateLink({ type: "magiclink", email });
    if (le || !link?.properties?.hashed_token) throw le ?? new Error("Sin token");
    const db = await supabaseUser();
    const { data: auth, error: ve } = await db.auth.verifyOtp({ type: "magiclink", token_hash: link.properties.hashed_token });
    if (ve || !auth.user) throw ve ?? new Error("Sin usuario");

    const ua = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
    await openAccessSession({ userId: auth.user.id, email, role, method: "CODE", userAgent: ua });
    return { ok: true, message: "Listo." };
  } catch (e) {
    console.error("[equipo] verifyStaffCode", e);
    return { ok: false, message: "No pudimos validar el código. Intenta de nuevo." };
  }
}

/** Salir del área de equipo: cierra la sesión de auditoría y la de Supabase. */
export async function staffSignOut(): Promise<void> {
  const db = await supabaseUser();
  const { data: { user } } = await db.auth.getUser();
  if (user) await supabaseService().from("access_sessions").update({ ended_at: new Date().toISOString() }).eq("user_id", user.id).is("ended_at", null);
  await db.auth.signOut();
}
